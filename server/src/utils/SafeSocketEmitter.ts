/**
 * Safe Socket Emitter
 * Responsabilidad: Wrapper seguro para emisiones de Socket.IO con manejo de errores
 * 
 * PROBLEMA QUE RESUELVE:
 * - Emisiones que fallan silenciosamente
 * - Datos malformados que causan crashes
 * - Falta de logs cuando algo sale mal
 * - Imposibilidad de debuggear problemas de emisión
 * 
 * SOLUCIÓN:
 * - Validación de datos antes de emitir
 * - Try-catch en todas las emisiones
 * - Logs detallados con contexto
 * - Verificación de usuarios conectados
 */

import { Server } from 'socket.io';
import { logger } from './logger';

interface EmitOptions {
    userId: string;
    event: string;
    data: unknown;
    platform?: string;
}

export class SafeSocketEmitter {
    /**
     * Emite un evento de Socket.IO de forma segura con manejo de errores
     * 
     * @param io - Instancia de Socket.IO
     * @param options - Opciones de emisión (userId, event, data, platform)
     * @returns true si la emisión fue exitosa, false si falló
     */
    static emit(io: Server, options: EmitOptions): boolean {
        const { userId, event, data, platform } = options;

        try {
            // 1. Validar que userId existe
            if (!userId || typeof userId !== 'string') {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: userId inválido'
                );
                return false;
            }

            // 2. Validar que el evento existe
            if (!event || typeof event !== 'string') {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: event inválido'
                );
                return false;
            }

            // 3. Validar que data no es undefined (null está permitido)
            if (data === undefined) {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: data es undefined'
                );
                return false;
            }

            // 4. Verificar que el usuario tiene sockets conectados (solo en producción)
            // En tests, io.sockets.adapter puede no existir, así que lo omitimos
            if (io.sockets?.adapter?.rooms) {
                const sockets = io.sockets.adapter.rooms.get(userId);
                if (!sockets || sockets.size === 0) {
                    logger.debug(
                        { userId, event, platform },
                        'SafeSocketEmitter: Usuario sin sockets activos, omitiendo emisión'
                    );
                    return false;
                }
            }

            // 5. Intentar serializar data para detectar referencias circulares
            try {
                JSON.stringify(data);
            } catch (serializationError) {
                logger.error(
                    { err: serializationError, userId, event, platform },
                    'SafeSocketEmitter: Error de serialización (posible referencia circular)'
                );
                return false;
            }

            // 6. Emitir el evento
            io.to(userId).emit(event, data);

            logger.debug(
                { userId, event, platform },
                'SafeSocketEmitter: Evento emitido exitosamente'
            );

            return true;

        } catch (error) {
            logger.error(
                { err: error, userId, event, platform },
                'SafeSocketEmitter: Error inesperado al emitir evento'
            );
            return false;
        }
    }

    /**
     * Emite un mensaje de chat de forma segura
     */
    static emitChatMessage(io: Server, userId: string, message: unknown, platform?: string): boolean {
        return this.emit(io, {
            userId,
            event: 'chat_message',
            data: message,
            platform
        });
    }

    /**
     * Emite una actualización de viewers de forma segura
     */
    static emitViewersUpdate(
        io: Server,
        userId: string,
        platform: string,
        count: number
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'viewers_update',
            data: { platform, count },
            platform
        });
    }

    /**
     * Emite un estado de conexión de forma segura
     */
    static emitConnectionStatus(
        io: Server,
        userId: string,
        platform: string,
        status: 'connecting' | 'connected' | 'disconnected' | 'error',
        message?: string
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'connection_status',
            data: { platform, status, message },
            platform
        });
    }

    /**
     * Emite un error de forma segura
     */
    static emitError(
        io: Server,
        userId: string,
        code: string,
        message: string,
        platform?: string
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'error',
            data: { code, message },
            platform
        });
    }
}
