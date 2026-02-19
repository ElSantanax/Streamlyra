/** Servicio de gestión de live chat y mensajes de YouTube */

import axios from 'axios';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeQuotaErrorHandler } from './YouTubeQuotaErrorHandler';
import { Connection } from '../../../models/Connection.model';
import { YouTubeStreamContext } from '../../../models/YouTubeStreamContext.model';
import { YouTubeBroadcastResponse } from '../../../types/youtube.types';
import { ConnectionService } from '../../connection/ConnectionService';

export class YouTubeLiveChatService {
    constructor(private connectionService?: ConnectionService) { }
    private readonly platformName = 'youtube';

    async getActiveLiveChatId(accessToken: string, channelId?: string): Promise<string | null> {
        // 1. Estrategia Cache-First: Consumo 0 de cuota
        if (channelId) {
            try {
                const cachedContext = await YouTubeStreamContext.findOne({
                    where: { channelId, isActive: true }
                });

                if (cachedContext?.liveChatId) {
                    logger.debug({ channelId, liveChatId: cachedContext.liveChatId }, 'YouTube: Cache hit for active LiveChatId (0 quota)');
                    return cachedContext.liveChatId;
                }
            } catch (error) {
                logger.warn({ err: error, channelId }, 'YouTube: Error reading stream context cache, falling back to API');
            }
        }

        // 2. Estrategia Fallback: Llamada a API (Consumo 1 cuota)
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
            if (!items || items.length === 0) {
                return null;
            }

            const liveChatId = items[0].snippet?.liveChatId;

            if (!liveChatId) {
                logger.info({
                    platform: this.platformName,
                    broadcastId: items[0].id
                }, 'Active broadcast found but has no live chat');
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

                logger.error({
                    status,
                    errorData,
                    platform: this.platformName
                }, 'YouTube API Error details');

                if (status === 403 && errorData?.error?.errors?.some((e) => e.reason === 'quotaExceeded')) {
                    await quotaManager.markAsExhausted();
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
    ): Promise<string> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE_SEND;

        if (!(await quotaManager.hasQuota(cost))) {
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
                        part: 'id,snippet'
                    },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            await quotaManager.consumeQuota(cost);

            if (response.status !== 200) {
                throw new Error(`YouTube API error: ${response.statusText}`);
            }

            const responseData = response.data as { id?: string };
            const messageId = responseData.id;
            if (!messageId) {
                throw new Error('YouTube no devolvió un ID de mensaje');
            }

            logger.info({ platform: this.platformName, liveChatId, messageId }, 'Chat message sent successfully');
            return messageId;
        } catch (error: unknown) {
            await YouTubeQuotaErrorHandler.handleQuotaError(error);

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

    /**
     * Actualiza el contexto del stream (videoId y liveChatId) a partir de un videoId
     * Usado principalmente por webhooks para fast-track discovery
     */
    async updateStreamContext(videoId: string, channelId: string): Promise<YouTubeStreamContext | null> {
        const cost = YouTubePollingConfig.OPERATION_COSTS.VIDEO_DETAILS;
        const quotaManager = YouTubeQuotaManager.getInstance();

        if (!(await quotaManager.hasQuota(cost))) {
            logger.warn({ platform: this.platformName }, 'Quota exhausted, skipping stream context update');
            return null;
        }

        try {
            logger.debug({ videoId, channelId }, 'YouTube: Updating stream context from webhook');

            // Necesitamos un token válido. Buscamos cualquier usuario conectado a este canal.
            const connection = await Connection.findOne({ where: { providerId: channelId, provider: 'youtube' } });

            if (!connection) {
                logger.debug({ channelId }, 'Webhook recibido para canal sin usuarios conectados, ignorando update de contexto');
                return null;
            }

            // Obtener token siempre válido — refresca automáticamente si está expirado
            let accessToken: string;
            if (this.connectionService) {
                const validToken = await this.connectionService.getValidAccessToken(connection.userId, 'youtube');
                if (!validToken) {
                    logger.warn({ channelId, userId: connection.userId }, 'YouTube: No se pudo obtener token válido para webhook update, abortando');
                    return null;
                }
                accessToken = validToken;
            } else {
                // Fallback: token crudo de DB (compatibilidad con instancias sin ConnectionService)
                accessToken = connection.accessToken;
            }

            const response = await axios.get<{ items: Array<{ id: string, liveStreamingDetails?: { activeLiveChatId?: string }, snippet: { liveBroadcastContent: string } }> }>(
                'https://www.googleapis.com/youtube/v3/videos',
                {
                    params: {
                        part: 'snippet,liveStreamingDetails',
                        id: videoId
                    },
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );

            await quotaManager.consumeQuota(cost);

            const item = response.data.items?.[0];
            if (!item) {
                logger.warn({ videoId }, 'YouTube: Video not found in videos.list during webhook update');
                return null;
            }

            const isLive = item.snippet.liveBroadcastContent === 'live';
            const liveChatId = item.liveStreamingDetails?.activeLiveChatId;

            logger.info({
                videoId,
                isLive,
                hasChat: !!liveChatId,
                status: item.snippet.liveBroadcastContent
            }, 'YouTube: Webhook video status check');

            if (isLive && liveChatId) {
                const [context] = await YouTubeStreamContext.upsert({
                    channelId,
                    videoId,
                    liveChatId,
                    isActive: true,
                    startedAt: new Date()
                });

                logger.info({ channelId, videoId, liveChatId }, 'YouTube: Stream Context actualizado via Webhook (Live detectado)');
                return context;
            } else {
                // Si el video deja de ser live, asegurar que el contexto se marque como inactivo
                const [updatedCount] = await YouTubeStreamContext.update(
                    { isActive: false, endedAt: new Date() },
                    { where: { videoId, isActive: true } }
                );

                if (updatedCount > 0) {
                    logger.info({ videoId }, 'YouTube: Stream Context marcado como inactivo vía Webhook (Stream finalizado o no es live)');
                }
            }

            return null;

        } catch (error) {
            logger.error({ err: error, platform: this.platformName, videoId }, 'YouTube: Error updating stream context from webhook');
            return null;
        }
    }
}
