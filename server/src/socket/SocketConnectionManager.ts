/** Gestor de conexión de socket con identificación de usuario y conexión a plataformas */

import { Socket, Server } from 'socket.io';
import { ChatManager } from '../services/ChatManager';
import { logger } from '../utils/logger';

const CONNECTION_TIMEOUT_MS = 30000;

const isValidUserId = (userId: unknown): userId is string => {
    if (typeof userId !== 'string') {
        return false;
    }

    if (userId.length === 0 || userId.length > 100) {
        return false;
    }

    // Validar formato UUID (v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
};

export class SocketConnectionManager {
    private socketUserMap: Map<string, string> = new Map();
    private userSocketCount: Map<string, number> = new Map();
    private connectingLocks: Map<string, Promise<void>> = new Map();

    constructor(private chatManager: ChatManager) { }

    getUserIdBySocketId(socketId: string): string | undefined {
        return this.socketUserMap.get(socketId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            logger.debug({ userId, socketId: socket.id }, 'Identificando usuario');

            this.socketUserMap.set(socket.id, userId);
            const currentCount = this.userSocketCount.get(userId) || 0;
            this.userSocketCount.set(userId, currentCount + 1);

            socket.join(userId);
            logger.debug({ userId, socketId: socket.id, socketCount: currentCount + 1 }, 'Socket unido a sala del usuario');

            const existingLock = this.connectingLocks.get(userId);
            if (existingLock) {
                logger.debug({ userId, socketId: socket.id }, 'Conexión ya en progreso, esperando...');
                await existingLock;
                logger.info({ userId, socketId: socket.id }, 'Usuario identificado (reutilizando conexión existente)');
                socket.emit('identified', { userId, message: 'Conectado a plataformas' });
                return;
            }

            if (currentCount === 0) {
                logger.info({ userId }, 'Primer socket del usuario, conectando plataformas');

                const connectionPromise = (async () => {
                    try {
                        const connectPromise = this.chatManager.connectUser(userId);
                        const timeoutPromise = new Promise<void>((_, reject) =>
                            setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS)
                        );
                        await Promise.race([connectPromise, timeoutPromise]);
                    } finally {
                        this.connectingLocks.delete(userId);
                    }
                })();

                this.connectingLocks.set(userId, connectionPromise);
                await connectionPromise;
            } else {
                logger.debug({ userId, socketCount: currentCount + 1 }, 'Usuario ya tiene sockets activos, reutilizando conexiones');
            }

            logger.info({ userId, socketId: socket.id }, 'Usuario identificado y plataformas conectadas');
            socket.emit('identified', { userId, message: 'Conectado a plataformas' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            logger.error({ err: error, userId, socketId: socket.id }, 'Error identificando usuario');

            this.socketUserMap.delete(socket.id);
            const currentCount = this.userSocketCount.get(userId) || 0;
            if (currentCount > 0) {
                const newCount = currentCount - 1;
                if (newCount === 0) {
                    logger.warn({ userId }, 'Error en identificación, limpiando conexiones parciales');
                    await this.chatManager.disconnectUser(userId);
                    this.userSocketCount.delete(userId);
                    this.connectingLocks.delete(userId);
                } else {
                    this.userSocketCount.set(userId, newCount);
                }
            }

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

    async handleDisconnect(socketId: string): Promise<void> {
        const userId = this.socketUserMap.get(socketId);

        if (!userId) {
            logger.debug({ socketId }, 'Socket desconectado sin userId asociado');
            return;
        }

        const currentCount = this.userSocketCount.get(userId) || 0;
        const newCount = Math.max(0, currentCount - 1);

        if (newCount === 0) {
            logger.info({ userId, socketId }, 'Último socket del usuario desconectado, limpiando plataformas');
            this.userSocketCount.delete(userId);

            const existingLock = this.connectingLocks.get(userId);
            if (existingLock) {
                logger.debug({ userId }, 'Esperando a que termine conexión en progreso antes de desconectar');
                await existingLock.catch(() => { /* Ignorar errores */ });
            }

            await this.chatManager.disconnectUser(userId);
        } else {
            logger.debug({ userId, socketId, remainingSockets: newCount }, 'Socket desconectado, otros sockets activos');
            this.userSocketCount.set(userId, newCount);
        }

        this.socketUserMap.delete(socketId);
    }
}
