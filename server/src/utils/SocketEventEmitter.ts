/**
 * Emisor de Eventos Socket.io
 * Responsabilidad: Centralizar emisión de eventos Socket.io
 * 
 * Proporciona métodos específicos para emitir eventos comunes
 * de forma consistente en toda la aplicación
 */

import { Server } from 'socket.io';
import { Platform } from '../constants/platforms';
import { logger } from './logger';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Clase para emitir eventos Socket.io de forma centralizada
 * 
 * Métodos:
 * - emitConnectionStatus() - Emite estado de conexión
 * - emitViewersUpdate() - Emite actualización de espectadores
 * - emitChatMessage() - Emite mensaje de chat
 * - emitError() - Emite error
 */
export class SocketEventEmitter {


    /**
     * Métodos estáticos para uso sin instancia
     */
    static emitConnectionStatus(
        io: Server,
        userId: string,
        platform: Platform,
        status: ConnectionStatus,
        message?: string
    ): void {
        const payload = {
            platform,
            status,
            ...(message && { message })
        };

        logger.debug(
            { userId, platform, status, message },
            'Emitting connection status'
        );

        io.to(userId).emit('connection_status', payload);
    }

    static emitViewersUpdate(io: Server, userId: string, platform: Platform, count: number): void {
        const payload = {
            platform,
            count: Math.max(0, count)
        };

        logger.debug(
            { userId, platform, count },
            'Emitting viewers update'
        );

        io.to(userId).emit('viewers_update', payload);
    }

    static emitChatMessage(io: Server, userId: string, message: unknown): void {
        logger.debug(
            { userId },
            'Emitting chat message'
        );

        io.to(userId).emit('chat_message', message);
    }

    static emitError(io: Server, userId: string, code: string, message: string): void {
        const payload = {
            code,
            message,
            timestamp: new Date().toISOString()
        };

        logger.warn(
            { userId, code, message },
            'Emitting error event'
        );

        io.to(userId).emit('error', payload);
    }

    // Instance methods removed to avoid duplication. Use static methods instead. 
}
