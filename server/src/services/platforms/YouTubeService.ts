import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { YouTubeChannelResponse } from '../../types/youtube.types';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';

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

/**
 * Servicio de YouTube
 * Responsabilidad: Autenticación OAuth específica de YouTube
 * 
 * Hereda métodos genéricos de BasePlatformService:
 * - getProfileAndTokens(code, codeVerifier)
 * - refreshAccessToken(refreshToken)
 * 
 * Implementa métodos específicos de YouTube:
 * - fetchUserProfile(accessToken)
 * - normalizePlatformProfile(channel)
 * 
 * NOTA: YouTube tiene estructura diferente:
 * - Retorna array de canales (items)
 * - Requiere validación de que items no esté vacío
 * - Genera providerUsername a partir del título
 */
import { Platform } from '../../constants/platforms';

export class YouTubeService extends BasePlatformService {
    protected readonly platformName: Platform = 'youtube';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://oauth2.googleapis.com/token',
        clientId: config.youtube.clientId!,
        clientSecret: config.youtube.clientSecret!,
        redirectUri: config.youtube.redirectUri!
    };

    /**
     * Obtiene perfil del usuario desde la API de YouTube
     * 
     * Endpoint: GET https://www.googleapis.com/youtube/v3/channels
     * Parámetros: part=snippet, mine=true
     * Retorna: Array de canales (items)
     * 
     * IMPORTANTE: YouTube requiere validación de que items no esté vacío
     */
    protected async fetchUserProfile(accessToken: string): Promise<YouTubeChannel> {
        try {
            logger.debug({ platform: this.platformName }, 'Fetching YouTube user profile');

            const userResponse = await axios.get<YouTubeChannelResponse>(
                'https://www.googleapis.com/youtube/v3/channels',
                {
                    params: { part: 'snippet', mine: true },
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            const items = userResponse.data.items;

            if (!items || items.length === 0) {
                logger.error({ platform: this.platformName }, 'No YouTube channel found');
                throw new Error('No se encontró canal de YouTube asociado.');
            }

            logger.debug({ platform: this.platformName, channelId: items[0].id }, 'YouTube profile fetched successfully');
            return items[0];
        } catch (error: unknown) {
            // Detectar error de cuota agotada de YouTube
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                const errorData = error.response.data as { error?: { message?: string; errors?: Array<{ reason?: string }> } };
                const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');

                if (isQuotaError) {
                    logger.warn(
                        {
                            platform: this.platformName,
                            message: '⚠️  CUOTA DE YOUTUBE AGOTADA - El usuario debe esperar hasta que se renueve la cuota diaria'
                        },
                        '⚠️  YouTube API quota exceeded during authentication'
                    );
                    throw new AppError(
                        '⚠️ La cuota de YouTube está temporalmente agotada. Por favor, intenta conectar tu cuenta más tarde (la cuota se renueva diariamente).',
                        503
                    );
                }
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
     * Normaliza perfil de YouTube al formato común
     * 
     * NOTA: YouTube no proporciona username, se genera a partir del título
     * - Elimina espacios
     * - Convierte a minúsculas
     * - Limita a 15 caracteres
     */
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

    /**
     * Obtiene el liveChatId del broadcast activo del usuario
     * 
     * @param accessToken - Token de acceso de YouTube
     * @returns liveChatId si hay un broadcast activo, null en caso contrario
     * 
     * Endpoint: GET /youtube/v3/liveBroadcasts
     * Parámetros: part=snippet, broadcastStatus=active, broadcastType=all
     * 
     * Validates: Requirements 6.1, 6.2
     */
    async getActiveLiveChatId(accessToken: string): Promise<string | null> {
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
                    }
                }
            );

            const broadcasts = response.data.items;
            if (!broadcasts || broadcasts.length === 0) {
                logger.debug({ platform: this.platformName }, 'No active broadcasts found');
                return null;
            }

            const liveChatId = broadcasts[0].snippet.liveChatId || null;
            logger.debug({ platform: this.platformName, liveChatId }, 'Active live chat ID retrieved');
            return liveChatId;
        } catch (error) {
            logger.error({ err: error, platform: this.platformName }, 'Failed to get active live chat ID');
            return null;
        }
    }

    /**
     * Envía un mensaje al chat en vivo de YouTube
     * 
     * @param accessToken - Token de acceso de YouTube
     * @param liveChatId - ID del chat en vivo
     * @param message - Mensaje a enviar
     * 
     * Endpoint: POST /youtube/v3/liveChat/messages
     * Query: part=snippet
     * Body: { snippet: { liveChatId, type, textMessageDetails } }
     * 
     * Validates: Requirements 6.1, 6.2
     */
    async sendChatMessage(
        accessToken: string,
        liveChatId: string,
        message: string
    ): Promise<void> {
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
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error(`YouTube API error: ${response.statusText}`);
            }

            logger.info({ platform: this.platformName, liveChatId }, 'Chat message sent successfully');
        } catch (error: unknown) {
            // Manejar errores de API con mensajes descriptivos
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                if (status === 401) {
                    // Para 401, re-lanzar el error original de axios para que MessageSenderService 
                    // pueda detectarlo y ejecutar la lógica de retry con refresh de token
                    error.message = 'Token de acceso inválido o expirado';
                    throw error;
                } else if (status === 403) {
                    const isQuotaError = (errorData?.error as any)?.errors?.some((e: any) => e.reason === 'quotaExceeded');
                    if (isQuotaError) {
                        throw new Error('Cuota de YouTube agotada. Intenta más tarde');
                    }
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
