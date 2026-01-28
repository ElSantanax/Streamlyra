/**
 * Manejador de Socket.io
 * Responsabilidad: Configurar listeners de Socket.io
 * 
 * IMPORTANTE: Cada plataforma se conecta de manera diferente:
 * - Twitch: Usa tmi.js (biblioteca externa)
 * - YouTube: Usa HTTP polling
 * - Kick: Usa HTTP polling + Webhook
 * - TikTok: Usa WebSocket (tiktok-live-connector)
 * 
 * Socket.io es el intermediario que:
 * 1. Recibe identificación del usuario
 * 2. Conecta todas las plataformas del usuario
 * 3. Emite eventos de chat a través de Socket.io
 * 4. Maneja desconexiones limpias
 */

import { Server, Socket } from 'socket.io';
import { ChatManager } from '../services/ChatManager';
import { SocketConnectionManager } from './SocketConnectionManager';
import { logger } from '../utils/logger';
import { MessageSenderService } from '../services/message/MessageSenderService';
import { SendMessageRequest } from '../types/message.types';

/**
 * Valida que el payload de send_message tenga la estructura correcta
 * Validates: Requirements 4.1, 4.2
 */
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

/**
 * Configura los manejadores de Socket.io
 * @param io - Instancia de Socket.io
 * @param chatManager - Gestor de conexiones a plataformas
 * @param messageSenderService - Servicio de envío de mensajes
 */
export const setupSocketHandlers = (
    io: Server,
    chatManager: ChatManager,
    messageSenderService: MessageSenderService
) => {
    logger.info({}, 'Configurando manejadores de Socket.io');

    const connectionManager = new SocketConnectionManager(chatManager);

    io.on('connection', (socket: Socket) => {
        logger.info({ socketId: socket.id }, 'Cliente conectado a Socket.io');

        /**
         * Evento: identify
         * Propósito: Identificar al usuario y conectar todas sus plataformas
         */
        socket.on('identify', async (userId: unknown) => {
            await connectionManager.handleIdentify(userId, socket, io);
        });

        /**
         * Evento: send_message
         * Propósito: Enviar un mensaje a múltiples plataformas simultáneamente
         * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 8.3
         */
        socket.on('send_message', async (payload: unknown) => {
            // Log al recibir evento send_message (Requirement 4.1)
            logger.info({ socketId: socket.id }, 'Received send_message event');
            
            try {
                // Validar estructura del payload (Requirement 4.1)
                if (!isValidSendMessagePayload(payload)) {
                    // Log de validación de payload (Requirement 4.1)
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

                // Verificar userId del socket contra userId del payload (Requirement 4.2)
                const sessionUserId = connectionManager.getUserIdBySocketId(socket.id);
                if (!sessionUserId || sessionUserId !== userId) {
                    // Log de validación de autorización (Requirement 4.1)
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

                // Filtrar TikTok de la lista de plataformas (Requirement 8.3)
                const filteredPlatforms = platforms.filter(p => p !== 'tiktok');

                logger.info(
                    { userId, platforms: filteredPlatforms, messageLength: message.length },
                    'Processing send_message request'
                );

                // Llamar a MessageSenderService.sendMessage (Requirement 4.3)
                const result = await messageSenderService.sendMessage({
                    userId,
                    message,
                    platforms: filteredPlatforms
                });

                // Emitir evento 'message_sent_result' con los resultados (Requirement 4.3)
                socket.emit('message_sent_result', result);

                logger.info(
                    { userId, success: result.success, platformCount: result.results.length },
                    'Message send completed'
                );

            } catch (error) {
                // Manejar excepciones y emitir error (Requirement 4.4)
                // Log de errores con contexto completo (Requirement 4.4)
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

        /**
         * Evento: disconnect
         * Propósito: Limpiar recursos cuando el cliente se desconecta
         */
        socket.on('disconnect', async () => {
            logger.info({ socketId: socket.id }, 'Cliente desconectado de Socket.io');
            await connectionManager.handleDisconnect(socket.id);
        });

        /**
         * Evento: error
         * Propósito: Manejar errores de Socket.io
         */
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
