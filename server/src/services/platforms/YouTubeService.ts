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

        if (!quotaManager.hasQuota(cost)) {
            throw new AppError(
                'La cuota de YouTube está agotada. No se puede obtener información del perfil en este momento.',
                503
            );
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
            this.handleQuotaError(error);

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

    private handleQuotaError(error: unknown): void {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            const errorData = error.response.data as { error?: { message?: string; errors?: Array<{ reason?: string }> } };
            const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');

            if (isQuotaError) {
                YouTubeQuotaManager.getInstance().markAsExhausted();
                throw new AppError(
                    'La cuota de YouTube está agotada. Por favor, intenta de nuevo más tarde.',
                    503
                );
            }
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
                        broadcastType: 'all'
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    timeout: 10000
                }
            );

            quotaManager.consumeQuota(cost);

            const broadcasts = response.data.items;
            if (!broadcasts || broadcasts.length === 0) {
                logger.debug({ platform: this.platformName }, 'No active broadcasts found');
                return null;
            }

            const liveChatId = broadcasts[0].snippet.liveChatId || null;
            logger.debug({ platform: this.platformName, liveChatId }, 'Active live chat ID retrieved');
            return liveChatId;
        } catch (error) {
            try {
                this.handleQuotaError(error);
            } catch {
                // Si es un error de cuota ya manejado, retornamos null silenciosamente ya que es polling
                return null;
            }
            logger.error({ err: error, platform: this.platformName }, 'Failed to get active live chat ID');
            return null;
        }
    }

    async sendChatMessage(
        accessToken: string,
        liveChatId: string,
        message: string
    ): Promise<void> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE;

        if (!quotaManager.hasQuota(cost)) {
            throw new Error('La cuota de YouTube está agotada. No se pudo enviar el mensaje.');
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
