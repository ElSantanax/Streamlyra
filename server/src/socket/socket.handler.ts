/** Manejador de Socket.io con configuración de listeners */

import { Server, Socket } from 'socket.io';
import { ChatManager } from '../services/ChatManager';
import { SocketConnectionManager } from './SocketConnectionManager';
import { logger } from '../utils/logger';
import { MessageSenderService } from '../services/message/MessageSenderService';
import { SendMessageRequest } from '../types/message.types';

function isValidSendMessagePayload(payload: unknown): payload is SendMessageRequest {
    if (!payload || typeof payload !== 'object') {
        return false;
    }
    
    const p = payload as Record<string, unknown>;
    
    return (
        typeof p.userId === 'string' &&
        typeof p.message === 'string' &&
        Array.isArray(p.platforms) &&
        p.platforms.every((platform: unknown) => typeof platform === 'string')
    );
}

export const setupSocketHandlers = (
    io: Server,
    chatManager: ChatManager,
    messageSenderService: MessageSenderService
) => {
    logger.info({}, 'Configurando manejadores de Socket.io');

    const connectionManager = new SocketConnectionManager(chatManager);

    io.on('connection', (socket: Socket) => {
        logger.info({ socketId: socket.id }, 'Cliente conectado a Socket.io');

        socket.on('identify', async (userId: unknown) => {
            await connectionManager.handleIdentify(userId, socket, io);
        });

        socket.on('send_message', async (payload: unknown) => {
            logger.info({ socketId: socket.id }, 'Received send_message event');
            
            try {
                if (!isValidSendMessagePayload(payload)) {
                    logger.warn({ 
                        socketId: socket.id, 
                        payload,
                        reason: 'Invalid payload structure'
                    }, 'Payload validation failed for send_message');
                    socket.emit('message_send_error', {
                        code: 'INVALID_PAYLOAD',
                        message: 'Datos inválidos. Verifica el mensaje y las plataformas.'
                    });
                    return;
                }
                logger.debug({ socketId: socket.id }, 'Payload validation passed');

                const { userId, message, platforms } = payload;

                const sessionUserId = connectionManager.getUserIdBySocketId(socket.id);
                if (!sessionUserId || sessionUserId !== userId) {
                    logger.warn(
                        { 
                            socketId: socket.id, 
                            payloadUserId: userId, 
                            sessionUserId,
                            reason: 'UserId mismatch or no session found'
                        },
                        'Authorization validation failed in send_message'
                    );
                    socket.emit('message_send_error', {
                        code: 'UNAUTHORIZED',
                        message: 'No autorizado'
                    });
                    return;
                }
                
                logger.debug({ socketId: socket.id, userId }, 'Authorization validation passed');

                const filteredPlatforms = platforms.filter(p => p !== 'tiktok');

                logger.info(
                    { userId, platforms: filteredPlatforms, messageLength: message.length },
                    'Processing send_message request'
                );

                const result = await messageSenderService.sendMessage({
                    userId,
                    message,
                    platforms: filteredPlatforms
                });

                socket.emit('message_sent_result', result);

                logger.info(
                    { userId, success: result.success, platformCount: result.results.length },
                    'Message send completed'
                );

            } catch (error) {
                logger.error({ 
                    err: error, 
                    socketId: socket.id,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    errorStack: error instanceof Error ? error.stack : undefined,
                    context: 'send_message handler'
                }, 'Unhandled error in send_message handler');
                socket.emit('message_send_error', {
                    code: 'INTERNAL_ERROR',
                    message: 'Error interno del servidor'
                });
            }
        });

        socket.on('disconnect', async () => {
            logger.info({ socketId: socket.id }, 'Cliente desconectado de Socket.io');
            await connectionManager.handleDisconnect(socket.id);
        });

        socket.on('error', (error: unknown) => {
            logger.error({ err: error, socketId: socket.id }, 'Error en Socket.io');
            socket.emit('error', {
                code: 'SOCKET_ERROR',
                message: 'Error en la conexión. Intenta de nuevo.'
            });
        });
    });

    logger.info({}, 'Manejadores de Socket.io configurados');
};
