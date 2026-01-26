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

/**
 * Configura los manejadores de Socket.io
 * @param io - Instancia de Socket.io
 * @param chatManager - Gestor de conexiones a plataformas
 */
export const setupSocketHandlers = (io: Server, chatManager: ChatManager) => {
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
