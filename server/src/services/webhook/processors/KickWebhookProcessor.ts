/**
 * Procesador de Webhooks de Kick
 * Responsabilidad: Procesar eventos de webhook de Kick
 */

import { Server } from 'socket.io';
import { Connection } from '../../../models/Connection.model';
import { KickChatMessagePayload } from '../../../types/kick.types';
import { KickEventTransformer } from '../../chat/transformers/KickEventTransformer';
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

            logger.info({ userId: connection.userId }, 'Emitting Kick chat message to user');
            this.io.to(connection.userId).emit('chat_message', chatMessage);
        } catch (error) {
            logger.error({ err: error }, 'Error processing Kick webhook event');
        }
    }
}
