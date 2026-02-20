import axios from 'axios';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeQuotaErrorHandler } from './YouTubeQuotaErrorHandler';
import { YouTubeStreamContext } from '../../../models/YouTubeStreamContext.model';
import { YouTubeBroadcastResponse } from '../../../types/youtube.types';

export class YouTubeLiveChatService {
    constructor() { }
    private readonly platformName = 'youtube';

    async getActiveLiveChatId(accessToken: string, channelId?: string): Promise<string | null> {
        if (channelId) {
            try {
                const cachedContext = await YouTubeStreamContext.findOne({
                    where: { channelId, isActive: true }
                });

                if (cachedContext?.liveChatId) {
                    logger.debug({ channelId, liveChatId: cachedContext.liveChatId }, 'YouTube: Cache hit for active LiveChatId');
                    return cachedContext.liveChatId;
                }
            } catch (error) {
                logger.warn({ err: error, channelId }, 'YouTube: Error reading stream context cache');
            }
        }

        const cost = YouTubePollingConfig.OPERATION_COSTS.BROADCAST_LIST;
        const quotaManager = YouTubeQuotaManager.getInstance();

        if (!(await quotaManager.hasQuota(cost))) {
            logger.warn({ platform: this.platformName }, 'Quota exhausted, returning null for active live chat');
            return null;
        }

        try {
            const response = await axios.get<YouTubeBroadcastResponse>(
                'https://www.googleapis.com/youtube/v3/liveBroadcasts',
                {
                    params: {
                        part: 'snippet',
                        broadcastStatus: 'active',
                        broadcastType: 'all',
                        maxResults: 1
                    },
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );

            await quotaManager.consumeQuota(cost);

            const items = response.data.items;
            if (!items || items.length === 0) return null;

            const liveChatId = items[0].snippet?.liveChatId;
            if (!liveChatId) {
                logger.info({ platform: this.platformName, broadcastId: items[0].id }, 'Active broadcast found but has no live chat');
            }

            return liveChatId || null;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as {
                    error?: {
                        errors?: Array<{ reason?: string }>;
                        message?: string;
                    };
                } | undefined;

                if (status === 403 && errorData?.error?.errors?.some((e) => e.reason === 'quotaExceeded')) {
                    await quotaManager.markAsExhausted();
                    throw new Error('Cuota de YouTube agotada. Intenta mañana.');
                }

                if (status === 400) {
                    throw new Error(`Error de configuración de YouTube (400): ${errorData?.error?.message || 'Petición inválida'}`);
                }
            }
            throw error;
        }
    }

    async sendChatMessage(
        accessToken: string,
        liveChatId: string,
        message: string
    ): Promise<string> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE_SEND;

        if (!(await quotaManager.hasQuota(cost))) {
            throw new Error('Cuota de YouTube agotada. Intenta mañana.');
        }

        try {
            const response = await axios.post(
                'https://www.googleapis.com/youtube/v3/liveChat/messages',
                {
                    snippet: {
                        liveChatId: liveChatId,
                        type: 'textMessageEvent',
                        textMessageDetails: { messageText: message }
                    }
                },
                {
                    params: { part: 'id,snippet' },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            await quotaManager.consumeQuota(cost);

            const responseData = response.data as { id?: string };
            const messageId = responseData.id;
            if (!messageId) throw new Error('YouTube no devolvió un ID de mensaje');

            logger.info({ platform: this.platformName, liveChatId, messageId }, 'Chat message sent successfully');
            return messageId;
        } catch (error: unknown) {
            await YouTubeQuotaErrorHandler.handleQuotaError(error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { error?: { message?: string } } | undefined;

                if (status === 401) {
                    throw new Error('Token de acceso inválido o expirado');
                } else if (status === 403) {
                    throw new Error('No tienes permisos para enviar mensajes en este chat');
                } else if (status === 404) {
                    throw new Error('Chat en vivo no encontrado');
                } else if (status === 429) {
                    throw new Error('Límite de tasa excedido. Intenta de nuevo más tarde');
                } else {
                    throw new Error(`Error de API de YouTube: ${errorData?.error?.message || error.message}`);
                }
            }
            throw error;
        }
    }
}