/** Servicio de YouTube con OAuth, detección de cuota agotada y envío de mensajes */

import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { YouTubeChannelResponse } from '../../types/youtube.types';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { YouTubeQuotaManager } from './YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';

interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        thumbnails?: {
            default?: {
                url: string;
            };
        };
    };
}

import { Platform } from '../../constants/platforms';

export class YouTubeService extends BasePlatformService {
    protected readonly platformName: Platform = 'youtube';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://oauth2.googleapis.com/token',
        clientId: config.oauth.youtube.clientId!,
        clientSecret: config.oauth.youtube.clientSecret!,
        redirectUri: config.oauth.youtube.redirectUri!
    };

    protected async fetchUserProfile(accessToken: string): Promise<YouTubeChannel> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHANNEL_INFO;

        // Si no hay cuota, usar perfil básico del token JWT
        if (!quotaManager.hasQuota(cost)) {
            logger.warn({ platform: this.platformName }, 'YouTube quota exhausted, using basic profile from token');
            return this.getBasicProfileFromToken(accessToken);
        }

        try {
            logger.debug({ platform: this.platformName }, 'Fetching YouTube user profile');

            const userResponse = await axios.get<YouTubeChannelResponse>(
                'https://www.googleapis.com/youtube/v3/channels',
                {
                    params: { part: 'snippet', mine: true },
                    headers: { Authorization: `Bearer ${accessToken}` },
                    timeout: 10000
                }
            );

            quotaManager.consumeQuota(cost);

            const items = userResponse.data.items;

            if (!items || items.length === 0) {
                logger.error({ platform: this.platformName }, 'No YouTube channel found');
                throw new Error('No se encontró canal de YouTube asociado.');
            }

            logger.debug({ platform: this.platformName, channelId: items[0].id }, 'YouTube profile fetched successfully');
            return items[0];
        } catch (error: unknown) {
            // Si es error de cuota, usar perfil básico en lugar de fallar
            if (this.isQuotaError(error)) {
                logger.warn({ platform: this.platformName }, 'YouTube quota exceeded, falling back to basic profile');
                return this.getBasicProfileFromToken(accessToken);
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const axiosError = error && typeof error === 'object' && 'response' in error
                ? error as { response?: { status?: number; data?: unknown } }
                : undefined;

            logger.error({
                platform: this.platformName,
                error: errorMessage,
                status: axiosError?.response?.status,
                data: axiosError?.response?.data
            }, 'Error fetching YouTube profile');
            throw error;
        }
    }

    /**
     * Obtiene información básica del perfil desde el token JWT de YouTube
     * Se usa como fallback cuando la cuota está agotada
     */
    private getBasicProfileFromToken(accessToken: string): YouTubeChannel {
        try {
            // Decodificar el JWT para obtener información básica
            const payloadBase64 = accessToken.split('.')[1];
            if (!payloadBase64) {
                throw new Error('Invalid token format');
            }

            const payloadString = Buffer.from(payloadBase64, 'base64').toString();
            const payload = JSON.parse(payloadString) as { sub?: string };

            // YouTube incluye el channel ID en el token
            const channelId = payload.sub || `yt_${Date.now()}`;

            logger.info({ channelId }, 'Using basic YouTube profile from token due to quota limits');

            return {
                id: channelId,
                snippet: {
                    title: `YouTube User ${channelId.substring(0, 8)}`,
                    thumbnails: {
                        default: {
                            url: ''
                        }
                    }
                }
            };
        } catch (error) {
            logger.error({ err: error }, 'Failed to decode YouTube token, using fallback profile');

            // Fallback completo si no se puede decodificar el token
            const fallbackId = `yt_${Date.now()}`;
            return {
                id: fallbackId,
                snippet: {
                    title: `YouTube User ${fallbackId.substring(0, 8)}`,
                    thumbnails: {
                        default: {
                            url: ''
                        }
                    }
                }
            };
        }
    }

    /**
     * Verifica si un error es de cuota agotada
     */
    private isQuotaError(error: unknown): boolean {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
            return errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded') || false;
        }
        return false;
    }

    private handleQuotaError(error: unknown): void {
        if (this.isQuotaError(error)) {
            YouTubeQuotaManager.getInstance().markAsExhausted();
            throw new AppError(
                'Cuota de YouTube agotada. Intenta mañana.',
                403
            );
        }
    }

    protected normalizePlatformProfile(channel: YouTubeChannel): PlatformProfile {
        return {
            provider: 'youtube',
            providerId: channel.id,
            providerUsername: channel.snippet.title
                .replace(/\s+/g, '')
                .toLowerCase()
                .substring(0, 15),
            displayName: channel.snippet.title,
            avatarUrl: channel.snippet.thumbnails?.default?.url || ''
        };
    }

    async getActiveLiveChatId(accessToken: string): Promise<string | null> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.BROADCAST_LIST;

        if (!quotaManager.hasQuota(cost)) {
            logger.warn({ platform: this.platformName }, 'Quota exhausted, skipping broadcast discovery');
            return null;
        }

        try {
            logger.debug({ platform: this.platformName }, 'Fetching active live chat ID');

            const response = await axios.get<{ items?: Array<{ snippet: { liveChatId?: string } }> }>(
                'https://www.googleapis.com/youtube/v3/liveBroadcasts',
                {
                    params: {
                        part: 'snippet',
                        broadcastStatus: 'active',
                        maxResults: 5
                    },
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: 10000
                }
            );

            quotaManager.consumeQuota(cost);

            const items = response.data.items || [];
            const liveChatId = items[0]?.snippet?.liveChatId || null;

            if (!liveChatId && items.length > 0) {
                logger.warn({ platform: this.platformName }, 'Broadcast found but liveChatId is missing. Check if chat is enabled.');
            }

            return liveChatId;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as {
                    error?: {
                        errors?: Array<{ reason?: string }>;
                        message?: string;
                    };
                } | undefined;

                logger.error({
                    status,
                    errorData,
                    platform: this.platformName
                }, 'YouTube API Error details');

                if (status === 403 && errorData?.error?.errors?.some((e) => e.reason === 'quotaExceeded')) {
                    quotaManager.markAsExhausted();
                    throw new Error('Cuota de YouTube agotada. Intenta mañana.');
                }

                if (status === 400) {
                    throw new Error(`Error de configuración de YouTube (400): ${errorData?.error?.message || 'Petición inválida'}`);
                }
            }

            logger.error({ err: error, platform: this.platformName }, 'Failed to get active live chat ID');
            throw error; // Rethrow para que MessageSenderService no diga "No hay directo"
        }
    }

    async sendChatMessage(
        accessToken: string,
        liveChatId: string,
        message: string
    ): Promise<void> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE_SEND;

        if (!quotaManager.hasQuota(cost)) {
            throw new Error('Cuota de YouTube agotada. Intenta mañana.');
        }

        try {
            logger.debug({ platform: this.platformName, liveChatId }, 'Sending chat message to YouTube');

            const response = await axios.post(
                'https://www.googleapis.com/youtube/v3/liveChat/messages',
                {
                    snippet: {
                        liveChatId: liveChatId,
                        type: 'textMessageEvent',
                        textMessageDetails: {
                            messageText: message
                        }
                    }
                },
                {
                    params: {
                        part: 'snippet'
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            quotaManager.consumeQuota(cost);

            if (response.status !== 200) {
                throw new Error(`YouTube API error: ${response.statusText}`);
            }

            logger.info({ platform: this.platformName, liveChatId }, 'Chat message sent successfully');
        } catch (error: unknown) {
            this.handleQuotaError(error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                if (status === 401) {
                    error.message = 'Token de acceso inválido o expirado';
                    throw error;
                } else if (status === 403) {
                    throw new Error('No tienes permisos para enviar mensajes en este chat');
                } else if (status === 404) {
                    throw new Error('Chat en vivo no encontrado');
                } else if (status === 429) {
                    throw new Error('Límite de tasa excedido. Intenta de nuevo más tarde');
                } else {
                    throw new Error(
                        `Error de API de YouTube: ${errorData?.error?.message || error.message}`
                    );
                }
            }
            throw error;
        }
    }
}
