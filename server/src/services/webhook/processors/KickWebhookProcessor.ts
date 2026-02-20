import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { KickChatMessagePayload, KickGiftEvent, KickSubscriptionEvent, KickFollowEvent, KickWebhookPayload, KickLivestreamStatusEvent } from '../../../types/kick.types';
import { KickEventTransformer } from '../../chat/transformers/KickEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { WebhookCache } from '../WebhookCache';

export class KickWebhookProcessor {
    private transformer: KickEventTransformer;
    private cache: WebhookCache;

    constructor(private io: Server) {
        this.transformer = new KickEventTransformer();
        this.cache = WebhookCache.getInstance();
    }

    async process(payload: KickWebhookPayload | { data: KickWebhookPayload }, eventType: string = 'chat.message.sent'): Promise<void> {
        try {
            const data = 'data' in payload ? payload.data : payload;
            const broadcaster = (data as KickWebhookPayload).broadcaster;
            const broadcasterKickId = broadcaster?.user_id?.toString();

            if (!broadcasterKickId) {
                logger.warn({
                    hasPayload: !!payload,
                    hasData: 'data' in payload,
                    eventType
                }, 'Kick webhook: No se pudo encontrar broadcaster.user_id en el payload');
                return;
            }

            const connCacheKey = WebhookCache.keys.connection('kick', broadcasterKickId);
            let connection = this.cache.get<Connection>(connCacheKey);

            if (!connection) {
                connection = await Connection.findOne({
                    where: { provider: 'kick', providerId: broadcasterKickId }
                });
                if (connection) {
                    this.cache.set(connCacheKey, connection);
                }
            }

            if (!connection) {
                logger.debug({ broadcasterKickId }, 'No connection found for Kick broadcaster');
                return;
            }

            const whCacheKey = WebhookCache.keys.webhook('kick', broadcasterKickId);
            let isActive = this.cache.get<boolean>(whCacheKey);

            if (isActive === null) {
                const webhook = await KickWebhook.findOne({
                    where: {
                        broadcasterId: broadcasterKickId,
                        isActive: true
                    }
                });
                isActive = !!webhook;
                this.cache.set(whCacheKey, isActive);
            }

            if (!isActive) {
                logger.debug(
                    { userId: connection.userId, broadcasterKickId, eventType },
                    'Kick webhook ignorado: El webhook no está registrado como activo para este canal'
                );
                return;
            }

            let chatMessage;
            if (eventType === 'channel.subscription.new' || eventType === 'channel.subscription.renewal') {
                chatMessage = this.transformer.transformSubscription(data as KickSubscriptionEvent);
            } else if (eventType === 'channel.subscription.gifts') {
                chatMessage = this.transformer.transformGift(data as KickGiftEvent);
            } else if (eventType === 'channel.followed') {
                chatMessage = this.transformer.transformFollow(data as KickFollowEvent);
            } else if (eventType === 'livestream.status.updated') {
                chatMessage = null;
            } else {
                chatMessage = this.transformer.transformMessage(data as KickChatMessagePayload);
            }

            logger.info(
                { userId: connection.userId, platform: 'kick', user: chatMessage?.user || 'Sistema', eventType },
                'Procesando evento de Kick recibido vía webhook'
            );

            KickWebhook.update(
                { lastEventAt: new Date() },
                { where: { broadcasterId: broadcasterKickId } }
            ).catch((err: unknown) =>
                logger.error({ err, broadcasterKickId }, 'Error updating webhook timestamp')
            );

            if (chatMessage) {
                const emitResult = SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'kick');

                if (!emitResult) {
                    logger.warn(
                        { userId: connection.userId, platform: 'kick' },
                        'Evento de Kick NO emitido al dashboard: Usuario sin sockets activos o bloqueado por eco'
                    );
                }
            } else if (eventType === 'livestream.status.updated') {
                const statusData = data as KickLivestreamStatusEvent;
                logger.info(
                    { userId: connection.userId, isLive: statusData.is_live, title: statusData.title },
                    'Actualizando estado de stream de Kick vía webhook'
                );

                SafeSocketEmitter.emitConnectionStatus(
                    this.io,
                    connection.userId,
                    'kick',
                    'connected',
                    statusData.is_live ? 'En vivo' : 'Desconectado',
                    statusData.is_live
                );

                if (!statusData.is_live) {
                    SafeSocketEmitter.emitViewersUpdate(
                        this.io,
                        connection.userId,
                        'kick',
                        0,
                        false
                    );
                }
            }

        } catch (error) {
            logger.error({ err: error }, 'Error fatal processing Kick webhook');
        }
    }
}