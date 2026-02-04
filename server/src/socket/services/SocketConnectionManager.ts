/** Gestor de conexión de socket con identificación de usuario y conexión a plataformas */

import { Socket, Server } from 'socket.io';
import { ChatManager } from '../../services/core/ChatManager';
import { ConnectionService } from '../../services/connection/ConnectionService';
import { ConnectionRepository } from '../../repositories/implementations/ConnectionRepository';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { logger } from '../../utils/logger';
import { isValidUserId } from '../utils/SocketValidator';
import { SocketRegistry } from './SocketRegistry';
import { SocketLockManager } from './SocketLockManager';

const CONNECTION_TIMEOUT_MS = 30000;

export class SocketConnectionManager {
    private registry = new SocketRegistry();
    private lockManager = new SocketLockManager();
    private connectionService: ConnectionService;

    constructor(private chatManager: ChatManager) {
        // Inicializar ConnectionService para obtener el estado de las conexiones
        const connectionRepository = new ConnectionRepository();
        this.connectionService = new ConnectionService(connectionRepository);
    }

    getUserIdBySocketId(socketId: string): string | undefined {
        return this.registry.getUserId(socketId);
    }

    async handleIdentify(userId: unknown, socket: Socket, io: Server): Promise<void> {
        if (!isValidUserId(userId)) {
            logger.warn({ userId, socketId: socket.id }, 'UserId inválido');
            socket.emit('error', {
                code: 'INVALID_USER_ID',
                message: 'UserId inválido. Debe ser un UUID válido.'
            });
            return;
        }

        try {
            logger.debug({ userId, socketId: socket.id }, 'Iniciando identificación de usuario');

            // 1. Registro del socket
            const { isFirstSocket } = this.registry.register(socket.id, userId);
            socket.join(userId);

            // 2. Manejo de la conexión a plataformas con Lock
            let connectionPromise = this.lockManager.getLock(userId);

            if (isFirstSocket && !connectionPromise) {
                logger.info({ userId }, 'Primer socket: Iniciando conexión a plataformas');

                connectionPromise = (async () => {
                    try {
                        const connectPromise = this.chatManager.connectUser(userId);
                        const timeoutPromise = new Promise<void>((_, reject) =>
                            setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS)
                        );
                        await Promise.race([connectPromise, timeoutPromise]);
                        logger.info({ userId }, 'Conexión a plataformas completada exitosamente');
                    } catch (error) {
                        logger.error({ err: error, userId }, 'Error durante la conexión inicial a plataformas');
                        throw error;
                    } finally {
                        this.lockManager.releaseLock(userId);
                    }
                })();

                this.lockManager.setLock(userId, connectionPromise);
            } else if (!isFirstSocket) {
                // Si no es el primer socket, re-emitir el estado actual de las conexiones
                // para que el cliente tenga el estado actualizado inmediatamente
                logger.debug({ userId, socketId: socket.id }, 'Socket adicional: Re-emitiendo estado de conexiones');
                await this.emitCurrentConnectionStatus(userId, io);
            }

            if (connectionPromise) {
                logger.debug({ userId, socketId: socket.id }, 'Esperando a que termine la conexión en curso...');
                await connectionPromise;
            }

            logger.info({ userId, socketId: socket.id }, 'Usuario identificado y verificado');
            socket.emit('identified', { userId, message: 'Conectado a plataformas' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            logger.error({ err: error, userId, socketId: socket.id }, 'Error fatal en handleIdentify');

            // Limpieza en caso de error
            const { remainingCount } = this.registry.rollbackRegistration(socket.id, userId as string);
            if (remainingCount === 0) {
                await this.chatManager.disconnectUser(userId as string).catch(() => { });
            }

            socket.emit('error', {
                code: errorMessage === 'Connection timeout' ? 'CONNECTION_TIMEOUT' : 'CONNECTION_ERROR',
                message: 'Error conexión'
            });
        }
    }

    async handleDisconnect(socketId: string): Promise<void> {
        const { userId, isLastSocket, remainingCount } = this.registry.remove(socketId);

        if (!userId) {
            logger.debug({ socketId }, 'Socket desconectado sin userId asociado');
            return;
        }

        if (isLastSocket) {
            logger.info({ userId, socketId }, 'Último socket desconectado: Preparando limpieza');

            // IMPORTANTE: Esperar a cualquier conexión que esté en curso antes de desconectar
            const existingLock = this.lockManager.getLock(userId);
            if (existingLock) {
                logger.debug({ userId }, 'Esperando cierre de conexión pendiente antes de desconectar');
                await existingLock.catch(() => { });
            }

            // Doble verificación: ¿entró un socket nuevo mientras esperábamos el lock?
            if (!this.registry.hasUser(userId)) {
                await this.chatManager.disconnectUser(userId);
                logger.info({ userId }, 'Plataformas desconectadas correctamente');
            } else {
                logger.info({ userId }, 'Nueva conexión detectada durante la limpieza, abortando desconexión');
            }
        } else {
            logger.debug({ userId, socketId, remainingSockets: remainingCount }, 'Socket removido, aún quedan sockets activos');
        }
    }

    getChatManager(): ChatManager {
        return this.chatManager;
    }

    /**
     * Emite el estado actual de todas las conexiones del usuario
     * Útil cuando un socket se reconecta y necesita el estado actualizado
     */
    private async emitCurrentConnectionStatus(userId: string, io: Server): Promise<void> {
        try {
            const connections = await this.connectionService.getAllConnections(userId);

            // Emitir el estado 'connected' para cada plataforma que tiene conexión activa
            connections.forEach(conn => {
                SafeSocketEmitter.emitConnectionStatus(
                    io,
                    userId,
                    conn.provider,
                    'connected',
                    'Reconectado'
                );
            });

            logger.debug(
                { userId, platformCount: connections.length },
                'Estado de conexiones re-emitido exitosamente'
            );
        } catch (error) {
            logger.error(
                { err: error, userId },
                'Error al re-emitir estado de conexiones'
            );
        }
    }
}
