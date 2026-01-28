/**
 * Gestor de Conexión de Socket
 * Responsabilidad: Manejar la identificación del usuario y conexión a plataformas
 */

import { Socket, Server } from 'socket.io';
import { ChatManager } from '../services/ChatManager';
import { logger } from '../utils/logger';

const CONNECTION_TIMEOUT_MS = 30000; // 30 segundos para conectar todas las plataformas

/**
 * Valida que el userId sea un string válido
 * Acepta: UUIDs, nanoid, cuid, y otros formatos alfanuméricos
 * Previene: inyección de caracteres especiales peligrosos
 */
const isValidUserId = (userId: unknown): userId is string => {
    if (typeof userId !== 'string') {
        return false;
    }
    
    // Validar longitud razonable
    if (userId.length === 0 || userId.length > 100) {
        return false;
    }
    
    // Permitir solo caracteres alfanuméricos, guiones y guiones bajos
    // Esto previene inyección pero es flexible con diferentes formatos de ID
    return /^[a-zA-Z0-9-_]+$/.test(userId);
};

export class SocketConnectionManager {
    // Mapeo de socketId -> userId para limpieza al desconectar
    private socketUserMap: Map<string, string> = new Map();
    // Contador de sockets por usuario para saber cuándo desconectar plataformas
    private userSocketCount: Map<string, number> = new Map();
    // Lock para prevenir conexiones simultáneas del mismo usuario
    // Almacena promesas de conexión en progreso para que otros sockets esperen
    private connectingLocks: Map<string, Promise<void>> = new Map();

    constructor(private chatManager: ChatManager) { }

    /**
     * Obtiene el userId asociado a un socketId
     * @param socketId - ID del socket
     * @returns userId o undefined si no existe
     */
    getUserIdBySocketId(socketId: string): string | undefined {
        return this.socketUserMap.get(socketId);
    }

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

            // Registrar el socket para este usuario
            this.socketUserMap.set(socket.id, userId);
            const currentCount = this.userSocketCount.get(userId) || 0;
            this.userSocketCount.set(userId, currentCount + 1);

            // Unir socket a sala del usuario
            socket.join(userId);
            logger.debug({ userId, socketId: socket.id, socketCount: currentCount + 1 }, 'Socket unido a sala del usuario');

            // Verificar si ya hay una conexión en progreso
            const existingLock = this.connectingLocks.get(userId);
            if (existingLock) {
                logger.debug({ userId, socketId: socket.id }, 'Conexión ya en progreso, esperando...');
                await existingLock;
                logger.info({ userId, socketId: socket.id }, 'Usuario identificado (reutilizando conexión existente)');
                socket.emit('identified', { userId, message: 'Conectado a plataformas' });
                return;
            }

            // Solo conectar plataformas si es el primer socket del usuario
            if (currentCount === 0) {
                logger.info({ userId }, 'Primer socket del usuario, conectando plataformas');
                
                // Crear lock para esta conexión
                const connectionPromise = (async () => {
                    try {
                        const connectPromise = this.chatManager.connectUser(userId);
                        const timeoutPromise = new Promise<void>((_, reject) =>
                            setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS)
                        );
                        await Promise.race([connectPromise, timeoutPromise]);
                    } finally {
                        // Siempre remover lock al completar (éxito o error)
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

            // Limpiar estado en caso de error
            this.socketUserMap.delete(socket.id);
            const currentCount = this.userSocketCount.get(userId) || 0;
            if (currentCount > 0) {
                const newCount = currentCount - 1;
                if (newCount === 0) {
                    // Si era el único socket, desconectar plataformas que pudieron haberse conectado
                    logger.warn({ userId }, 'Error en identificación, limpiando conexiones parciales');
                    await this.chatManager.disconnectUser(userId);
                    this.userSocketCount.delete(userId);
                    // Limpiar lock en caso de error
                    this.connectingLocks.delete(userId);
                } else {
                    this.userSocketCount.set(userId, newCount);
                }
            }

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

    /**
     * Maneja la desconexión del socket
     * Limpia recursos y desconecta plataformas si es el último socket del usuario
     */
    async handleDisconnect(socketId: string): Promise<void> {
        const userId = this.socketUserMap.get(socketId);
        
        if (!userId) {
            logger.debug({ socketId }, 'Socket desconectado sin userId asociado');
            return;
        }

        // Decrementar contador de sockets
        const currentCount = this.userSocketCount.get(userId) || 0;
        const newCount = Math.max(0, currentCount - 1);
        
        if (newCount === 0) {
            // Último socket del usuario, desconectar plataformas
            logger.info({ userId, socketId }, 'Último socket del usuario desconectado, limpiando plataformas');
            this.userSocketCount.delete(userId);
            
            // Esperar a que termine cualquier conexión en progreso antes de desconectar
            const existingLock = this.connectingLocks.get(userId);
            if (existingLock) {
                logger.debug({ userId }, 'Esperando a que termine conexión en progreso antes de desconectar');
                await existingLock.catch(() => { /* Ignorar errores */ });
            }
            
            // Desconectar todas las plataformas del usuario
            await this.chatManager.disconnectUser(userId);
        } else {
            // Todavía hay otros sockets activos
            logger.debug({ userId, socketId, remainingSockets: newCount }, 'Socket desconectado, otros sockets activos');
            this.userSocketCount.set(userId, newCount);
        }

        // Limpiar mapeo
        this.socketUserMap.delete(socketId);
    }
}
