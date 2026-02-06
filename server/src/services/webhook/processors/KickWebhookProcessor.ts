/** Procesador de webhooks de Kick con validación de estado y sockets activos */

import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { KickChatMessagePayload, KickGiftEvent, KickSubscriptionEvent, KickFollowEvent, KickWebhookPayload } from '../../../types/kick.types';
import { KickEventTransformer } from '../../chat/transformers/KickEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class KickWebhookProcessor {
    private transformer: KickEventTransformer;

    constructor(private io: Server) {
        this.transformer = new KickEventTransformer();
    }

    async process(payload: KickWebhookPayload | { data: KickWebhookPayload }, eventType: string = 'chat.message.sent'): Promise<void> {
        try {
            // Kick a veces envuelve el payload en un objeto 'data'
            const data = 'data' in payload ? payload.data : payload;
            let broadcasterKickId: string | undefined;

            if (eventType === 'channel.follow') {
                broadcasterKickId = (data as KickFollowEvent).broadcaster_user_id?.toString();
            } else {
                const broadcaster = (data as KickChatMessagePayload | KickSubscriptionEvent | KickGiftEvent).broadcaster;
                broadcasterKickId = broadcaster?.user_id?.toString();
            }

            if (!broadcasterKickId) {
                logger.warn({
                    hasPayload: !!payload,
                    hasData: 'data' in payload,
                    eventType
                }, 'Kick webhook: No se pudo encontrar broadcaster.user_id en el payload');
                return;
            }

            let chatMessage;
            if (eventType === 'channel.subscription.new' || eventType === 'channel.subscription.renewal') {
                chatMessage = this.transformer.transformSubscription(data as KickSubscriptionEvent);
            } else if (eventType === 'channel.subscription.gifts') {
                chatMessage = this.transformer.transformGift(data as KickGiftEvent);
            } else if (eventType === 'channel.follow') {
                chatMessage = this.transformer.transformFollow(data as KickFollowEvent);
            } else {
                chatMessage = this.transformer.transformMessage(data as KickChatMessagePayload);
            }

            // Buscar la conexión del broadcaster
            const connection = await Connection.findOne({
                where: {
                    provider: 'kick',
                    providerId: broadcasterKickId
                }
            });

            if (!connection) {
                logger.debug({ broadcasterKickId }, 'No connection found for Kick broadcaster');
                return;
            }

            // Buscar el webhook activo
            const webhook = await KickWebhook.findOne({
                where: {
                    broadcasterId: broadcasterKickId,
                    isActive: true
                }
            });

            if (!webhook) {
                logger.info(
                    { userId: connection.userId, broadcasterKickId, eventType },
                    'Kick webhook ignorado: El webhook no está registrado como activo para este canal'
                );
                return;
            }

            logger.info(
                { userId: connection.userId, platform: 'kick', user: chatMessage.user, eventType },
                'Procesando evento de Kick recibido vía webhook'
            );

            // Actualización asíncrona del timestamp
            void webhook.update({ lastEventAt: new Date() }).catch((err: unknown) =>
                logger.error({ err, webhookId: webhook.id }, 'Error updating webhook timestamp')
            );

            // OPTIMIZACIÓN 4: Emisión directa
            const emitResult = SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'kick');

            if (!emitResult) {
                logger.warn(
                    { userId: connection.userId, platform: 'kick' },
                    'Evento de Kick NO emitido al dashboard: Usuario sin sockets activos o bloqueado por eco'
                );
            }

        } catch (error) {
            logger.error({ err: error }, 'Error fatal processing Kick webhook');
        }
    }
}
