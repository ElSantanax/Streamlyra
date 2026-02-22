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

        const uid = userId as string;
        try {
            logger.debug({ userId: uid, socketId: socket.id }, 'Iniciando identificación de usuario');

            const { isFirstSocket } = this.registry.register(socket.id, uid);
            socket.join(uid);

            let connectionPromise = this.lockManager.getLock(uid);

            if (!isFirstSocket && !connectionPromise) {
                logger.debug({ userId: uid }, 'Usuario ya conectado (Hot Path), omitiendo inicialización pesada');
                socket.emit('identified', { userId: uid, message: 'Sesión activa restaurada' });
                return;
            }

            if (isFirstSocket && !connectionPromise) {
                logger.info({ userId: uid }, 'Primer socket: Iniciando conexión a plataformas');

                connectionPromise = (async () => {
                    try {
                        const connectPromise = this.chatManager.connectUser(uid);
                        const timeoutPromise = new Promise<void>((_, reject) =>
                            setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS)
                        );
                        await Promise.race([connectPromise, timeoutPromise]);
                        logger.info({ userId: uid }, 'Conexión a plataformas completada exitosamente');
                    } catch (error) {
                        logger.error({ err: error, userId: uid }, 'Error durante la conexión inicial a plataformas');
                        throw error;
                    } finally {
                        this.lockManager.releaseLock(uid);
                    }
                })();

                this.lockManager.setLock(uid, connectionPromise);
            }

            if (connectionPromise) {
                logger.debug({ userId: uid, socketId: socket.id }, 'Esperando a que termine la conexión en curso...');
                await connectionPromise;
            }

            logger.info({ userId: uid, socketId: socket.id }, 'Usuario identificado y verificado');
            socket.emit('identified', { userId: uid, message: 'Conectado a plataformas' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            logger.error({ err: error, userId, socketId: socket.id }, 'Error fatal en handleIdentify');

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

            const existingLock = this.lockManager.getLock(userId);
            if (existingLock) {
                logger.debug({ userId }, 'Esperando cierre de conexión pendiente antes de desconectar');
                await existingLock.catch(() => { });
            }

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