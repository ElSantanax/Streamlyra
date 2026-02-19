import { Server } from 'socket.io';
import { logger } from '../../../utils/logger';
import { YouTubePubSubParser, YouTubeNotification } from '../../chat/youtube/YouTubePubSubParser';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { YouTubeLiveChatService } from '../../platforms/youtube/YouTubeLiveChatService';
import { WebhookCache } from '../WebhookCache';
import { ConnectionService } from '../../connection/ConnectionService';

export class YouTubeWebhookProcessor {
    private cache: WebhookCache;
    private liveChatService: YouTubeLiveChatService;

    constructor(private io: Server, connectionService: ConnectionService) {
        this.cache = WebhookCache.getInstance();
        this.liveChatService = new YouTubeLiveChatService(connectionService);
    }

    /**
     * Procesa una notificación de YouTube
     */
    async process(payload: { channelId: string, xmlBody: string }): Promise<void> {
        const { channelId, xmlBody } = payload;
        try {
            logger.debug({ channelId }, 'Procesando notificación de YouTube PubSubHubbub');

            // Parsear XML
            const notification = YouTubePubSubParser.parseNotification(xmlBody);

            if (!notification) {
                logger.warn({ channelId }, 'No se pudo parsear la notificación de YouTube');
                return;
            }

            logger.info({
                channelId: notification.channelId,
                videoId: notification.videoId,
                title: notification.title,
                publishedAt: notification.publishedAt
            }, 'Notificación de YouTube recibida');

            // Verificar si es una notificación reciente (posible inicio de stream)
            const isRecent = YouTubePubSubParser.isLiveNotification(notification);

            if (!isRecent) {
                logger.debug({ videoId: notification.videoId }, 'Notificación antigua, ignorando');
                return;
            }

            // Actualizar contexto de stream y verificar si es un directo real con chat
            try {
                const context = await this.liveChatService.updateStreamContext(notification.videoId, notification.channelId);

                // IMPORTANTE: Solo procedemos si el contexto confirma que es un Directo ACTIVO
                if (context?.isActive && context?.liveChatId) {
                    logger.info({ videoId: notification.videoId }, 'YouTube: Directo confirmado vía Webhook, notificando a usuarios');

                    // 1. Notificar estado a conectado (cambio visual inmediato)
                    await this.notifyStreamFound(notification.channelId, notification.videoId);

                    // 2. Notificar actualización de stream (para recarga selectiva)
                    await this.notifyConnectedUsers(notification);
                } else {
                    logger.debug({ videoId: notification.videoId }, 'YouTube: Notificación ignorada (no es un directo activo o no tiene chat)');
                }
            } catch (error) {
                logger.error({ err: error, videoId: notification.videoId }, 'Error al validar directo desde webhook');
            }

        } catch (error) {
            logger.error({ err: error, channelId }, 'Error procesando notificación de YouTube');
        }
    }

    /**
     * Obtiene las conexiones de un canal usando caché
     */
    private async getChannelConnections(channelId: string): Promise<Connection[]> {
        const cacheKey = WebhookCache.keys.connection('youtube', channelId);
        let connections = this.cache.get<Connection[]>(cacheKey);

        if (!connections) {
            connections = await Connection.findAll({
                where: { provider: 'youtube', providerId: channelId }
            });
            this.cache.set(cacheKey, connections);
        }

        return connections;
    }

    /**
     * Notifica un cambio de estado a conectado si se detectó el stream vía webhook
     */
    private async notifyStreamFound(channelId: string, videoId: string): Promise<void> {
        const connections = await this.getChannelConnections(channelId);

        for (const connection of connections) {
            SafeSocketEmitter.emitConnectionStatus(
                this.io,
                connection.userId,
                'youtube',
                'connected',
                'Detectado vía Webhook',
                true
            );
            logger.info({ userId: connection.userId, videoId }, 'YouTube: Estado forzado a "connected" vía Webhook');
        }
    }

    /**
     * Notifica a usuarios que tienen conectado este canal
     */
    private async notifyConnectedUsers(notification: YouTubeNotification): Promise<void> {
        try {
            // Buscar todas las conexiones de YouTube para este canal
            const connections = await this.getChannelConnections(notification.channelId);

            if (connections.length === 0) {
                logger.debug({ channelId: notification.channelId }, 'No hay usuarios conectados a este canal');
                return;
            }

            // Emitir evento a cada usuario
            for (const connection of connections) {
                SafeSocketEmitter.emit(this.io, {
                    userId: connection.userId,
                    event: 'youtube:stream_update',
                    data: {
                        channelId: notification.channelId,
                        videoId: notification.videoId,
                        title: notification.title,
                        link: notification.link,
                        publishedAt: notification.publishedAt,
                        type: 'new_video'
                    },
                    platform: 'youtube'
                });

                logger.info({
                    userId: connection.userId,
                    channelId: notification.channelId,
                    videoId: notification.videoId
                }, 'Notificación de stream de YouTube enviada al usuario');
            }
        } catch (error) {
            logger.error({ err: error }, 'Error notificando a usuarios conectados');
        }
    }
}

