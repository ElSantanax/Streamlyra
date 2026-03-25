import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { KickChatMessagePayload, KickGiftEvent, KickSubscriptionEvent, KickFollowEvent, KickWebhookPayload, KickLivestreamStatusEvent, KickRewardRedemptionEvent } from '../../../types/kick.types';
import { KickEventTransformer } from '../../chat/transformers/KickEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { AnalyticsService } from '../../core/AnalyticsService';

export class KickWebhookProcessor {
    private transformer: KickEventTransformer;

    constructor(private io: Server) {
        this.transformer = new KickEventTransformer();
    }

    async process(payload: KickWebhookPayload | { data: KickWebhookPayload }, eventType: string = 'chat.message.sent'): Promise<void> {
        try {
            const data = (('data' in payload ? payload.data : payload) as unknown) as Record<string, unknown>;

            // Search for broadcaster ID in multiple possible locations
            const broadcasterObj = data.broadcaster as Record<string, unknown> | undefined;
            const broadcasterKickId = (
                (broadcasterObj?.user_id as string | number | undefined) ||
                (payload as unknown as Record<string, unknown>).broadcaster_user_id ||
                (data.broadcaster_user_id as string | number | undefined) ||
                (data.chatroom_id as string | number | undefined)
            )?.toString();

            if (!broadcasterKickId) {
                logger.warn({
                    eventType,
                    payloadKeys: Object.keys(payload),
                    dataKeys: data ? Object.keys(data) : []
                }, 'Kick webhook: No se pudo encontrar broadcaster.user_id en el payload');
                return;
            }

            // Consulta directa a la DB para Conexión
            const connection = await Connection.findOne({
                where: { provider: 'kick', providerId: broadcasterKickId }
            });

            if (!connection) {
                logger.warn({ broadcasterKickId }, 'Kick Webhook: No se encontró conexión en DB para este canal');
                return;
            }

            // Consulta directa a la DB para estado del Webhook
            const webhook = await KickWebhook.findOne({
                where: {
                    broadcasterId: broadcasterKickId,
                    isActive: true
                }
            });

            if (!webhook) {
                logger.warn(
                    { userId: connection.userId, broadcasterKickId, eventType },
                    'Kick Webhook: Recibido pero ignorado porque isActive=false en DB'
                );
                return;
            }

            let chatMessage;
            if (eventType === 'channel.subscription.new' || eventType === 'channel.subscription.renewal') {
                chatMessage = this.transformer.transformSubscription(data as unknown as KickSubscriptionEvent);
            } else if (eventType === 'channel.subscription.gifts') {
                chatMessage = this.transformer.transformGift(data as unknown as KickGiftEvent);
            } else if (eventType === 'channel.followed') {
                const followEvent = data as unknown as KickFollowEvent;
                chatMessage = this.transformer.transformFollow(followEvent);

                // Actualizar analíticas de último seguidor
                AnalyticsService.updateLastFollower(connection.userId, 'kick', chatMessage.user)
                    .then(updated => {
                        if (updated) {
                            SafeSocketEmitter.emitLastFollowerUpdate(this.io, connection.userId, {
                                name: updated.lastFollowerName,
                                platform: updated.lastFollowerPlatform,
                                at: updated.lastFollowerAt
                            });
                        }
                    })
                    .catch(err => logger.error({ err, userId: connection.userId }, 'Error procesando analytics de seguidor en Kick'));
            } else if (eventType === 'channel.reward.redemption.updated') {
                chatMessage = this.transformer.transformRewardRedemption(data as unknown as KickRewardRedemptionEvent);
            } else if (eventType === 'livestream.status.updated') {
                chatMessage = null;
            } else {
                chatMessage = this.transformer.transformMessage(data as unknown as KickChatMessagePayload);
            }

            logger.debug(
                {
                    userId: connection.userId,
                    platform: 'kick',
                    user: chatMessage?.user || 'Sistema',
                    eventType,
                    hasChatMessage: !!chatMessage
                },
                'Procesando evento de Kick recibido vía webhook'
            );

            KickWebhook.update(
                { lastEventAt: new Date() },
                { where: { broadcasterId: broadcasterKickId } }
            ).catch((err: unknown) =>
                logger.error({ err, broadcasterKickId }, 'Error updating webhook timestamp')
            );

            if (chatMessage) {
                logger.debug({ userId: connection.userId, msg: chatMessage.message.substring(0, 20) }, 'Emitiendo mensaje de Kick a SafeSocketEmitter');
                const emitResult = SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'kick');

                if (!emitResult) {
                    logger.warn(
                        { userId: connection.userId, platform: 'kick' },
                        'Evento de Kick NO emitido al dashboard: Usuario sin sockets activos o bloqueado por eco'
                    );
                }
            } else if (eventType === 'livestream.status.updated') {
                const statusData = data as unknown as KickLivestreamStatusEvent;
                logger.debug(
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