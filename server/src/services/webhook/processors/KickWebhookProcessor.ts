/** Procesador de webhooks de Kick con validación de estado y sockets activos */

import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { KickChatMessagePayload } from '../../../types/kick.types';
import { KickEventTransformer } from '../../chat/transformers/KickEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class KickWebhookProcessor {
    private transformer: KickEventTransformer;

    constructor(private io: Server) {
        this.transformer = new KickEventTransformer();
    }

    async process(payload: KickChatMessagePayload): Promise<void> {
        try {
            const { broadcaster } = payload;
            const broadcasterKickId = broadcaster?.user_id?.toString();

            if (!broadcasterKickId) {
                logger.warn({ payload: !!payload }, 'Kick webhook payload missing broadcaster.user_id');
                return;
            }

            const chatMessage = this.transformer.transformMessage(payload);

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
                logger.debug({ userId: connection.userId, broadcasterKickId }, 'Webhook inactivo o no encontrado');
                return;
            }

            // OPTIMIZACIÓN 2: Eliminamos fetchSockets(). 
            // SafeSocketEmitter ya verifica rooms internamente de forma eficiente.
            // Esto ahorra una costosa operación asíncrona por cada mensaje de chat.

            // OPTIMIZACIÓN 3: Los logs de flujo normal pasan a DEBUG.
            // Solo INFO para hitos críticos o problemas.
            logger.debug(
                { userId: connection.userId, platform: 'kick', msg: chatMessage.message?.substring(0, 20) },
                'Processing Kick chat message'
            );

            // Actualización asíncrona del timestamp
            void webhook.update({ lastEventAt: new Date() }).catch((err: unknown) =>
                logger.error({ err, webhookId: webhook.id }, 'Error updating webhook timestamp')
            );

            // OPTIMIZACIÓN 4: Emisión directa
            const emitResult = SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'kick');

            if (!emitResult) {
                logger.debug({ userId: connection.userId }, 'Message not emitted (user likely offline)');
            }

        } catch (error) {
            logger.error({ err: error }, 'Error fatal processing Kick webhook');
        }
    }
}
