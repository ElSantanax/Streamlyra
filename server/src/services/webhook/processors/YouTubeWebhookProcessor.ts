import { logger } from '../../../utils/logger';
import { YouTubePubSubParser } from '../../chat/youtube/YouTubePubSubParser';
import { Connection } from '../../../models/Connection.model';
import { ChatManager } from '../../core/ChatManager';

export class YouTubeWebhookProcessor {
    constructor(
        private chatManager: ChatManager
    ) { }

    async process(payload: { channelId: string, xmlBody: string }): Promise<void> {
        const { channelId, xmlBody } = payload;
        try {
            logger.debug({ channelId }, 'Procesando notificación de YouTube PubSubHubbub');

            const notification = YouTubePubSubParser.parseNotification(xmlBody);

            if (!notification) {
                logger.warn({ channelId }, 'No se pudo parsear la notificación de YouTube');
                return;
            }

            logger.info({
                channelId: notification.channelId,
                videoId: notification.videoId,
                title: notification.title
            }, 'YouTube: Webhook "despertador" recibido');

            const connections = await this.getChannelConnections(notification.channelId);

            if (connections.length === 0) {
                logger.debug({ channelId: notification.channelId }, 'No hay usuarios activos para este canal, ignorando');
                return;
            }

            for (const connection of connections) {
                logger.info({ userId: connection.userId }, 'YouTube: Webhook disparando Boost de descubrimiento');

                void this.chatManager.boostProviderDiscovery(connection.userId, 'youtube')
                    .catch(err => logger.error({ err, userId: connection.userId }, 'Error al ejecutar boost desde webhook'));
            }

        } catch (error) {
            logger.error({ err: error, channelId }, 'Error procesando notificación de YouTube');
        }
    }

    private async getChannelConnections(channelId: string): Promise<Connection[]> {
        return await Connection.findAll({
            where: { provider: 'youtube', providerId: channelId }
        });
    }
}