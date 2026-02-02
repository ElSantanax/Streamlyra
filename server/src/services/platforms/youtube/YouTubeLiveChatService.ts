/** Servicio de gestión de live chat y mensajes de YouTube */

import axios from 'axios';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeQuotaErrorHandler } from './YouTubeQuotaErrorHandler';

export class YouTubeLiveChatService {
    private readonly platformName = 'youtube';

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
            YouTubeQuotaErrorHandler.handleQuotaError(error);

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
