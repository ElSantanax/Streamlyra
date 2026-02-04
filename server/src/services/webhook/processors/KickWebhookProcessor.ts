/** Procesador de webhooks de Kick con validación de estado y sockets activos */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { KickChatMessagePayload, KickGiftEvent, KickSubscriptionEvent } from '../../../types/kick.types';
import { KickEventTransformer } from '../../chat/transformers/KickEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class KickWebhookProcessor {
    private transformer: KickEventTransformer;

    constructor(private io: Server) {
        this.transformer = new KickEventTransformer();
    }


    async process(payload: any, eventType: string = 'chat.message.sent'): Promise<void> {
        try {
            // Kick a veces envuelve el payload en un objeto 'data'
            const data = payload.data || payload;
            const { broadcaster } = data;
            const broadcasterKickId = broadcaster?.user_id?.toString();

            if (!broadcasterKickId) {
                logger.warn({
                    hasPayload: !!payload,
                    hasData: !!payload.data,
                    keys: Object.keys(payload)
                }, 'Kick webhook: No se pudo encontrar broadcaster.user_id en el payload');
                return;
            }

            let chatMessage;
            if (eventType === 'channel.subscription.new' || eventType === 'channel.subscription.renewal') {
                chatMessage = this.transformer.transformSubscription(data as KickSubscriptionEvent);
            } else if (eventType === 'channel.subscription.gifts') {
                chatMessage = this.transformer.transformGift(data as KickGiftEvent);
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

            // OPTIMIZACIÓN 2: Eliminamos fetchSockets(). 
            // SafeSocketEmitter ya verifica rooms internamente de forma eficiente.
            // Esto ahorra una costosa operación asíncrona por cada mensaje de chat.

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
