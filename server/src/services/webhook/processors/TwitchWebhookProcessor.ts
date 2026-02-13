/** Procesador de webhooks de Twitch (EventSub) con validación de estado y sockets activos */

import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import {
    TwitchEventSubNotificationPayload,
    TwitchFollowEventSub,
    TwitchSubEventSub,
    TwitchRaidEventSub,
    TwitchChatMessageEventSub
} from '../../../types/twitch.types';
import { TwitchEventTransformer } from '../../chat/transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

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

            // Buscar la conexión del broadcaster
            const connection = await Connection.findOne({
                where: {
                    provider: 'twitch',
                    providerId: broadcasterId
                }
            });

            if (!connection) {
                logger.debug({ broadcasterId }, 'No connection found for Twitch broadcaster');
                return;
            }

            // Buscar el webhook activo
            const webhook = await TwitchWebhook.findOne({
                where: {
                    broadcasterId: broadcasterId,
                    type: eventType,
                    status: 'enabled'
                }
            });

            if (!webhook) {
                logger.info(
                    { userId: connection.userId, broadcasterId, eventType },
                    'Twitch webhook ignorado: Suscripción no activa en DB para este tipo de evento'
                );
                return;
            }

            // Actualización asíncrona del timestamp
            void webhook.update({ lastEventAt: new Date() }).catch((err: unknown) =>
                logger.error({ err, webhookId: webhook.id }, 'Error actualizando timestamp de Twitch webhook')
            );

            let chatMessage;
            const event = payload.event;

            switch (eventType) {
                case 'channel.chat.message':
                    chatMessage = this.transformer.transformEventSubChatMessage(event as TwitchChatMessageEventSub);
                    break;
                case 'channel.follow':
                    chatMessage = this.transformer.transformEventSubFollow(event as TwitchFollowEventSub);
                    break;
                case 'channel.subscribe':
                    chatMessage = this.transformer.transformEventSubSubscription(event as TwitchSubEventSub);
                    break;
                case 'channel.raid':
                    chatMessage = this.transformer.transformEventSubRaid(event as TwitchRaidEventSub);
                    break;
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

            // Emisión al dashboard
            if (chatMessage) {
                logger.info(
                    { userId: connection.userId, platform: 'twitch', user: chatMessage.user, eventType },
                    'Procesando evento de Twitch recibido vía EventSub'
                );

                SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'twitch');
            }

        } catch (error) {
            logger.error({ err: error, eventType }, 'Error fatal procesando Twitch webhook');
        }
    }
}
