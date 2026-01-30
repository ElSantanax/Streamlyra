/** Manejador de Socket.io con configuración de listeners */

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ChatManager } from '../services/ChatManager';
import { SocketConnectionManager } from './SocketConnectionManager';
import { logger } from '../utils/logger';
import { MessageSenderService } from '../services/message/MessageSenderService';
import { SendMessageRequest } from '../types/message.types';
import { ActivityService } from '../services/ActivityService';

// Extender interfaz SocketData
declare module 'socket.io' {
    interface SocketData {
        userId?: string;
    }
}

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
    messageSenderService: MessageSenderService,
    activityService: ActivityService
) => {
    logger.info({}, 'Configurando manejadores de Socket.io');

    const connectionManager = new SocketConnectionManager(chatManager);

    // Middleware de autenticación JWT
    io.use((socket, next) => {
        let token = (socket.handshake.auth.token as string | undefined) || (socket.handshake.headers.authorization?.split(' ')[1]);

        // Si no hay token en auth o headers, intentar buscar en cookies
        if (!token) {
            const cookieHeader = socket.handshake.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, curr) => {
                    const [key, value] = curr.split('=').map(c => c.trim());
                    if (key && value) {
                        acc[key] = value;
                    }
                    return acc;
                }, {} as Record<string, string>);

                token = cookies['auth_token'];
            }
        }

        if (!token) {
            logger.warn({ socketId: socket.id }, 'Socket connection attempt without token');
            return next(new Error('Authentication error: Token required'));
        }

        try {
            const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
            (socket.data as { userId?: string }).userId = decoded.id;
            next();
        } catch (err) {
            logger.warn({ socketId: socket.id, err }, 'Socket authentication failed');
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const authenticatedUserId = (socket.data as { userId?: string }).userId;

        if (!authenticatedUserId) {
            socket.disconnect();
            return;
        }

        logger.info({ socketId: socket.id, userId: authenticatedUserId }, 'Cliente autenticado conectado a Socket.io');

        // Automáticamente identificar al usuario autenticado
        // Ya no confiamos en un evento 'identify' con el ID en el payload
        connectionManager.handleIdentify(authenticatedUserId, socket, io);

        // Mantener compatibilidad con clientes que envían 'identify'
        // pero ignorar el payload y usar el ID autenticado
        socket.on('identify', async () => {
            // Ya manejado al conectar, pero respondemos por compatibilidad
            socket.emit('identified', { userId: authenticatedUserId, message: 'Conectado de forma segura' });
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

                // VALIDACIÓN CRÍTICA DE SEGURIDAD
                // Asegurar que el usuario solo pueda enviar mensajes como él mismo
                if (authenticatedUserId !== userId) {
                    logger.warn(
                        {
                            socketId: socket.id,
                            payloadUserId: userId,
                            authenticatedUserId,
                            reason: 'UserId spoofing attempt'
                        },
                        'SECURITY: Blocked attempt to send message as another user'
                    );
                    socket.emit('message_send_error', {
                        code: 'UNAUTHORIZED',
                        message: 'No autorizado para enviar mensajes como este usuario'
                    });
                    return;
                }

                // La validación de autorización ahora se realiza directamente con authenticatedUserId
                // y se asume que el payload.userId es el mismo que authenticatedUserId
                const sessionUserId = authenticatedUserId as string;

                logger.debug({ socketId: socket.id, userId: sessionUserId }, 'Authorization validation passed');

                const filteredPlatforms = platforms.filter(p => p !== 'tiktok');

                logger.info(
                    { userId: sessionUserId, platforms: filteredPlatforms, messageLength: message.length },
                    'Processing send_message request'
                );

                // Emitir el mensaje al dashboard INMEDIATAMENTE para feedback optimista
                // Esto da sensación de rapidez mientras se envía a las plataformas en background
                const messageId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const chatMessage: {
                    id: string;
                    platform: string;
                    user: string;
                    message: string;
                    time: string;
                    color: string;
                    isOwner: boolean;
                    status: string;
                } = {
                    id: messageId,
                    platform: 'dashboard',
                    user: 'Tú',
                    message,
                    time: new Date().toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    color: '#10B981', // Verde para mensajes propios
                    isOwner: true,
                    status: 'sending' // Estado inicial: enviando
                };

                io.to(sessionUserId).emit('chat_message', chatMessage);

                // Enviar a las plataformas (esto puede tardar varios segundos)
                const result = await messageSenderService.sendMessage({
                    userId: sessionUserId,
                    message,
                    platforms: filteredPlatforms
                });

                // Actualizar el estado del mensaje según el resultado
                const successfulPlatforms = result.results.filter(r => r.success);
                const failedPlatforms = result.results.filter(r => !r.success);

                let finalStatus: string;
                let errorMessage: string | undefined;

                if (successfulPlatforms.length === result.results.length) {
                    // Éxito total
                    finalStatus = 'sent';
                } else if (successfulPlatforms.length > 0) {
                    // Éxito parcial
                    finalStatus = 'error';
                    errorMessage = `Falló en: ${failedPlatforms.map(r => r.platform).join(', ')}`;
                } else {
                    // Error total
                    finalStatus = 'error';
                    errorMessage = 'No se pudo enviar a ninguna plataforma';
                }

                // Emitir actualización del estado del mensaje
                io.to(sessionUserId).emit('message_status_update', {
                    messageId,
                    status: finalStatus,
                    errorMessage
                });

                socket.emit('message_sent_result', result);

                logger.info(
                    { userId: sessionUserId, success: result.success, platformCount: result.results.length },
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
            const userId = connectionManager.getUserIdBySocketId(socket.id);
            await connectionManager.handleDisconnect(socket.id);

            // Si el usuario ya no tiene sockets, limpiar actividad
            if (userId && !io.sockets.adapter.rooms.get(userId)) {
                activityService.cleanupUser(userId);
            }
        });

        // Registrar actividad en cualquier evento
        socket.onAny(() => {
            if (authenticatedUserId) {
                activityService.recordActivity(authenticatedUserId);
            }
        });

        // Evento explícito de heartbeat
        socket.on('heartbeat', () => {
            if (authenticatedUserId) {
                activityService.recordActivity(authenticatedUserId);
            }
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
