import { Server } from 'socket.io';
import { logger } from '../../../utils/logger';
import { YouTubePubSubParser } from '../../chat/youtube/YouTubePubSubParser';
import { Connection } from '../../../models/Connection.model';
import { WebhookCache } from '../WebhookCache';
import { ConnectionService } from '../../connection/ConnectionService';
import { ChatManager } from '../../core/ChatManager';

export class YouTubeWebhookProcessor {
    private cache: WebhookCache;

    constructor(
        private io: Server,
        private connectionService: ConnectionService,
        private chatManager: ChatManager
    ) {
        this.cache = WebhookCache.getInstance();
    }

    /**
     * Procesa una notificación de YouTube
     */
    async process(payload: { channelId: string, xmlBody: string }): Promise<void> {
        const { channelId, xmlBody } = payload;
        try {
            logger.debug({ channelId }, 'Procesando notificación de YouTube PubSubHubbub');

            // 1. Parsear XML (Costo 0 de cuota)
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

            // 2. Buscar usuarios asociados a este canal
            const connections = await this.getChannelConnections(notification.channelId);

            if (connections.length === 0) {
                logger.debug({ channelId: notification.channelId }, 'No hay usuarios activos para este canal, ignorando');
                return;
            }

            // 3. Disparar búsqueda de directos (Discovery Boost) para cada usuario
            // Esto usa liveBroadcasts.list que es la única fuente fiable para directos.
            // Si el video era un upload normal, findLiveBroadcast simplemente no encontrará nada (Costo 1).
            // Si es un live real, lo encontrará y conectará (Costo 1).
            for (const connection of connections) {
                logger.info({ userId: connection.userId }, 'YouTube: Webhook disparando Boost de descubrimiento');

                // Disparamos en segundo plano para no bloquear el webhook respuesta
                void this.chatManager.boostProviderDiscovery(connection.userId, 'youtube')
                    .catch(err => logger.error({ err, userId: connection.userId }, 'Error al ejecutar boost desde webhook'));
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
}

