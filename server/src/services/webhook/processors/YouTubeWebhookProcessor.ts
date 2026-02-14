/**
 * Procesador de Webhooks de YouTube (PubSubHubbub)
 * Maneja notificaciones de nuevos videos y streams en vivo
 */

import { Server } from 'socket.io';
import { logger } from '../../../utils/logger';
import { YouTubePubSubParser, YouTubeNotification } from '../../chat/youtube/YouTubePubSubParser';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { YouTubeLiveChatService } from '../../platforms/youtube/YouTubeLiveChatService';

export class YouTubeWebhookProcessor {
    constructor(private io: Server) { }

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

            // Actualizar contexto de stream (verificar si es live real y obtener liveChatId) antes de notificar
            // Esto asegura que la DB tenga el estado correcto para los pollers
            try {
                const liveChatService = new YouTubeLiveChatService();
                const context = await liveChatService.updateStreamContext(notification.videoId, notification.channelId);

                // Si encontramos un chat activo, notificar al frontend DE INMEDIATO para cambiar estado a conectado
                if (context?.liveChatId) {
                    await this.notifyStreamFound(notification.channelId, notification.videoId);
                }
            } catch (error) {
                logger.warn({ err: error, videoId: notification.videoId }, 'Fallo al actualizar contexto de stream desde webhook, continuando notificación');
            }

            // Buscar usuarios conectados a este canal y notificarles (evento original)
            await this.notifyConnectedUsers(notification);

        } catch (error) {
            logger.error({ err: error, channelId }, 'Error procesando notificación de YouTube');
        }
    }

    /**
     * Notifica un cambio de estado a conectado si se detectó el stream vía webhook
     */
    private async notifyStreamFound(channelId: string, videoId: string): Promise<void> {
        const connections = await Connection.findAll({
            where: { provider: 'youtube', providerId: channelId }
        });

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
            const connections = await Connection.findAll({
                where: {
                    provider: 'youtube',
                    providerId: notification.channelId
                }
            });

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
