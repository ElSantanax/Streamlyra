import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import {
    TwitchEventSubNotificationPayload,
    TwitchFollowEventSub,
    TwitchSubEventSub,
    TwitchRaidEventSub,
    TwitchChatMessageEventSub,
    TwitchRewardRedemptionEventSub
} from '../../../types/twitch.types';
import { TwitchEventTransformer } from '../../chat/transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { AnalyticsService } from '../../core/AnalyticsService';

export class TwitchWebhookProcessor {

    private transformer: TwitchEventTransformer;

    constructor(private io: Server) {
        this.transformer = new TwitchEventTransformer();
    }

    async process(payload: TwitchEventSubNotificationPayload, eventType: string): Promise<void> {
        try {
            const condition = payload.subscription.condition;
            const broadcasterId =
                condition.broadcaster_user_id ||
                condition.to_broadcaster_user_id ||
                condition.user_id;

            if (!broadcasterId) {
                logger.warn({ eventType, condition }, 'Twitch webhook: No se pudo identificar el canal (broadcasterId) en el payload');
                return;
            }

            const connection = await Connection.findOne({
                where: { provider: 'twitch', providerId: broadcasterId }
            });

            if (!connection) {
                logger.debug({ broadcasterId }, 'No connection found for Twitch broadcaster');
                return;
            }

            const webhook = await TwitchWebhook.findOne({
                where: {
                    broadcasterId: broadcasterId,
                    type: eventType,
                    status: 'enabled'
                }
            });

            if (!webhook) {
                logger.debug(
                    { userId: connection.userId, broadcasterId, eventType },
                    'Twitch webhook ignorado: Suscripción no activa en DB para este tipo de evento'
                );
                return;
            }

            TwitchWebhook.update(
                { lastEventAt: new Date() },
                { where: { broadcasterId, type: eventType } }
            ).catch((err: unknown) =>
                logger.error({ err, broadcasterId, eventType }, 'Error actualizando timestamp de Twitch webhook')
            );

            let chatMessage;
            const event = payload.event;

            switch (eventType) {
                case 'channel.chat.message':
                    chatMessage = this.transformer.transformEventSubChatMessage(event as TwitchChatMessageEventSub);
                    break;
                case 'channel.follow': {
                    const followEvent = event as TwitchFollowEventSub;
                    chatMessage = this.transformer.transformEventSubFollow(followEvent);

                    // Actualizar analíticas de último seguidor de forma asíncrona (fuego y olvido)
                    AnalyticsService.updateLastFollower(connection.userId, 'twitch', chatMessage.user)
                        .then(updated => {
                            if (updated) {
                                SafeSocketEmitter.emitLastFollowerUpdate(this.io, connection.userId, {
                                    name: updated.lastFollowerName,
                                    platform: updated.lastFollowerPlatform,
                                    at: updated.lastFollowerAt
                                });
                            }
                        })
                        .catch(err => logger.error({ err, userId: connection.userId }, 'Error procesando analytics de seguidor en Twitch'));
                    break;
                }
                case 'channel.subscribe':
                    chatMessage = this.transformer.transformEventSubSubscription(event as TwitchSubEventSub);
                    break;
                case 'channel.raid': {
                    const raidEvent = event as TwitchRaidEventSub;
                    chatMessage = this.transformer.transformEventSubRaid(raidEvent);

                    // Actualizar analíticas de último raid
                    AnalyticsService.updateLastRaid(connection.userId, 'twitch', raidEvent.from_broadcaster_user_name, raidEvent.viewers)
                        .then(updated => {
                            if (updated) {
                                SafeSocketEmitter.emitLastRaidUpdate(this.io, connection.userId, {
                                    name: updated.lastRaidName,
                                    platform: updated.lastRaidPlatform,
                                    viewers: updated.lastRaidViewers,
                                    at: updated.lastRaidAt
                                });
                            }
                        })
                        .catch(err => logger.error({ err, userId: connection.userId }, 'Error procesando analytics de raid en Twitch'));
                    break;
                }
                case 'channel.channel_points_custom_reward_redemption.add':
                    chatMessage = this.transformer.transformEventSubRewardRedemption(event as TwitchRewardRedemptionEventSub);
                    break;
                case 'channel.channel_points_custom_reward_redemption.update':
                    return;
                case 'stream.online':
                    SafeSocketEmitter.emitConnectionStatus(this.io, connection.userId, 'twitch', 'connected', 'En vivo', true);
                    return;
                case 'stream.offline':
                    SafeSocketEmitter.emitConnectionStatus(this.io, connection.userId, 'twitch', 'connected', 'Desconectado', false);
                    SafeSocketEmitter.emitViewersUpdate(this.io, connection.userId, 'twitch', 0, false);
                    return;
                default:
                    logger.debug({ eventType }, 'Tipo de evento de Twitch no manejado por chatMessage');
                    return;
            }

            if (chatMessage) {
                logger.debug({ eventType, chatMessage }, 'Emitiendo chatMessage de Twitch');
                SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'twitch');
            }

        } catch (error) {
            logger.error({ err: error, eventType }, 'Error fatal procesando Twitch webhook');
        }
    }
}