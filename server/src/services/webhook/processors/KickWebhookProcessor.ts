/**
 * Procesador de Webhooks de Kick
 * Responsabilidad: Procesar eventos de webhook de Kick con validación de estado
 */

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

            const chatMessage = this.transformer.transformMessage(payload);

            const broadcasterKickId = broadcaster?.user_id;
            if (!broadcasterKickId) {
                logger.warn({}, 'Kick webhook payload missing broadcaster.user_id');
                return;
            }

            logger.debug({ broadcasterKickId }, 'Looking up connection for Kick broadcaster');
            const connection = await Connection.findOne({
                where: {
                    provider: 'kick',
                    providerId: broadcasterKickId.toString()
                }
            });

            if (!connection) {
                logger.warn({ broadcasterKickId }, 'No connection found for Kick broadcaster');
                return;
            }

            // VALIDACIÓN: Verificar si el webhook está activo en nuestra DB
            const webhook = await KickWebhook.findOne({
                where: {
                    broadcasterId: broadcasterKickId.toString(),
                    isActive: true
                }
            });

            if (!webhook) {
                logger.warn(
                    { 
                        broadcasterKickId, 
                        userId: connection.userId 
                    }, 
                    'Webhook inactivo, ignorando evento de Kick'
                );
                return;
            }

            // VALIDACIÓN: Verificar si el usuario tiene sockets conectados
            const userSockets = await this.io.in(connection.userId).fetchSockets();
            if (userSockets.length === 0) {
                logger.warn(
                    { 
                        broadcasterKickId, 
                        userId: connection.userId 
                    }, 
                    'Usuario sin sockets activos, ignorando evento de Kick'
                );
                return;
            }

            // Actualizar timestamp del último evento
            void webhook.update({ lastEventAt: new Date() });

            logger.info({ userId: connection.userId }, 'Emitting Kick chat message to user');
            SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'kick');
        } catch (error) {
            logger.error({ err: error }, 'Error processing Kick webhook event');
        }
    }
}
