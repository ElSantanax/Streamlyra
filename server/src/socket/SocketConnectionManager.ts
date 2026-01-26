/**
 * Gestor de Conexión de Socket
 * Responsabilidad: Manejar la identificación del usuario y conexión a plataformas
 */

import { Socket, Server } from 'socket.io';
import { ChatManager } from '../services/ChatManager';
import { logger } from '../utils/logger';

const CONNECTION_TIMEOUT_MS = 30000; // 30 segundos para conectar todas las plataformas
const VALID_USERID_PATTERN = /^[a-f0-9-]{36}$/; // UUID v4 pattern

/**
 * Valida que el userId sea un UUID válido
 */
const isValidUserId = (userId: unknown): userId is string => {
    if (typeof userId !== 'string') {
        return false;
    }
    return VALID_USERID_PATTERN.test(userId);
};

export class SocketConnectionManager {
    constructor(private chatManager: ChatManager) { }

    /**
     * Maneja la identificación del usuario
     * Flujo:
     * 1. Validar userId
     * 2. Unir socket a sala del usuario
     * 3. Conectar todas las plataformas (con timeout)
     * 4. Emitir confirmación o error
     */
    async handleIdentify(userId: unknown, socket: Socket, _io: Server): Promise<void> {
        // Validar userId
        if (!isValidUserId(userId)) {
            logger.warn({ userId, socketId: socket.id }, 'UserId inválido');
            socket.emit('error', {
                code: 'INVALID_USER_ID',
                message: 'UserId inválido. Debe ser un UUID válido.'
            });
            return;
        }

        try {
            logger.debug({ userId, socketId: socket.id }, 'Identificando usuario');

            // Unir socket a sala del usuario
            socket.join(userId);
            logger.debug({ userId, socketId: socket.id }, 'Socket unido a sala del usuario');

            // Conectar todas las plataformas con timeout
            const connectionPromise = this.chatManager.connectUser(userId);
            const timeoutPromise = new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS)
            );

            await Promise.race([connectionPromise, timeoutPromise]);

            logger.info({ userId, socketId: socket.id }, 'Usuario identificado y plataformas conectadas');
            socket.emit('identified', { userId, message: 'Conectado a plataformas' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            logger.error({ err: error, userId, socketId: socket.id }, 'Error identificando usuario');

            // Emitir error específico
            if (errorMessage === 'Connection timeout') {
                socket.emit('error', {
                    code: 'CONNECTION_TIMEOUT',
                    message: 'Timeout al conectar a plataformas. Intenta de nuevo.'
                });
            } else {
                socket.emit('error', {
                    code: 'CONNECTION_ERROR',
                    message: 'Error al conectar a plataformas. Intenta de nuevo.'
                });
            }
        }
    }
}
