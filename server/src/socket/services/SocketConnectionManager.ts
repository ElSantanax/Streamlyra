/** Gestor de conexión de socket con identificación de usuario y conexión a plataformas */

import { Socket, Server } from 'socket.io';
import { ChatManager } from '../../services/core/ChatManager';

import { logger } from '../../utils/logger';
import { isValidUserId } from '../utils/SocketValidator';
import { SocketRegistry } from './SocketRegistry';
import { SocketLockManager } from './SocketLockManager';
import { StreamSessionManager } from '../../services/core/StreamSessionManager';

const CONNECTION_TIMEOUT_MS = 10000;

export class SocketConnectionManager {
    private registry = new SocketRegistry();
    private lockManager = new SocketLockManager();
    private connectedUsers = new Set<string>();


    constructor(private chatManager: ChatManager) {
    }

    getUserIdBySocketId(socketId: string): string | undefined {
        return this.registry.getUserId(socketId);
    }

    async handleIdentify(userId: unknown, socket: Socket, _io: Server): Promise<void> {
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

            // 0. CHECK RÁPIDO: Si ya sabemos que este usuario está full conectado (Hot Path)
            if (this.registry.hasUser(userId as string) && this.connectedUsers.has(userId as string)) {
                // Registrar el socket sin efectos secundarios pesados
                this.registry.register(socket.id, userId as string);
                socket.join(userId as string);

                logger.debug({ userId }, 'Usuario ya conectado (Hot Path), omitiendo inicialización pesada');
                socket.emit('identified', { userId, message: 'Sesión activa restaurada' });
                return;
            }

            // 1. Registro del socket
            const { isFirstSocket } = this.registry.register(socket.id, userId as string);
            socket.join(userId as string);

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
                        this.lockManager.releaseLock(userId as string);
                    }
                })();

                this.lockManager.setLock(userId as string, connectionPromise);
            }

            if (connectionPromise) {
                logger.debug({ userId, socketId: socket.id }, 'Esperando a que termine la conexión en curso...');
                await connectionPromise;
            }

            this.connectedUsers.add(userId as string);

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

            // Limpieza de caché de estado
            this.connectedUsers.delete(userId);

            // IMPORTANTE: Esperar a cualquier conexión que esté en curso antes de desconectar
            const existingLock = this.lockManager.getLock(userId);
            if (existingLock) {
                logger.debug({ userId }, 'Esperando cierre de conexión pendiente antes de desconectar');
                await existingLock.catch(() => { });
            }

            // Doble verificación: ¿entró un socket nuevo mientras esperábamos el lock?
            if (!this.registry.hasUser(userId)) {
                await this.chatManager.disconnectUser(userId);
                StreamSessionManager.getInstance().clearSession(userId);
                logger.info({ userId }, 'Plataformas desconectadas correctamente y sesión limpiada');
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
}
