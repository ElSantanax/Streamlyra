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
            logger.info({
                payloadKeys: Object.keys(payload || {}),
                broadcaster: payload?.broadcaster?.username,
                sender: payload?.sender?.username,
                contentPreview: payload?.content?.substring(0, 50)
            }, '🔄 KICK WEBHOOK PROCESSOR: Iniciando procesamiento');

            const { broadcaster } = payload;

            const chatMessage = this.transformer.transformMessage(payload);
            
            logger.info({
                transformedMessage: {
                    user: chatMessage.user,
                    messagePreview: chatMessage.message?.substring(0, 50),
                    isOwner: chatMessage.isOwner,
                    platform: chatMessage.platform
                }
            }, '✅ KICK WEBHOOK PROCESSOR: Mensaje transformado');

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
            
            logger.info({
                broadcasterKickId,
                userId: connection.userId,
                connectionId: connection.id
            }, '✅ KICK WEBHOOK PROCESSOR: Conexión encontrada');

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
            
            logger.info({
                webhookId: webhook.id,
                isActive: webhook.isActive
            }, '✅ KICK WEBHOOK PROCESSOR: Webhook activo verificado');

            const userSockets = await this.io.in(connection.userId).fetchSockets();
            
            logger.info(
                { 
                    broadcasterKickId, 
                    userId: connection.userId,
                    socketCount: userSockets.length,
                    socketIds: userSockets.map(s => s.id),
                    rooms: Array.from(this.io.sockets.adapter.rooms.keys())
                }, 
                'Kick webhook: Verificando sockets del usuario'
            );
            
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

            void webhook.update({ lastEventAt: new Date() });

            logger.info(
                { 
                    userId: connection.userId,
                    message: chatMessage.message,
                    user: chatMessage.user,
                    isOwner: chatMessage.isOwner
                }, 
                'Emitting Kick chat message to user'
            );
            
            const emitResult = SafeSocketEmitter.emitChatMessage(this.io, connection.userId, chatMessage, 'kick');
            
            logger.info(
                { 
                    userId: connection.userId,
                    emitResult,
                    platform: 'kick'
                }, 
                'KICK WEBHOOK PROCESSOR: Resultado de emisión'
            );
        } catch (error) {
            logger.error({ err: error }, 'Error processing Kick webhook event');
        }
    }
}
