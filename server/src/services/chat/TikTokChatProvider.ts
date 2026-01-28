/**
 * Proveedor de Chat de TikTok
 * Responsabilidad: Orquestar conexión a chat de TikTok
 */

import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { ChatProvider } from './ChatProvider';
import { TikTokConnectionManager } from './tiktok/TikTokConnectionManager';
import { TikTokEventListener } from './tiktok/TikTokEventListener';
import { TikTokEventTransformer } from './transformers/TikTokEventTransformer';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { Connection } from '../../models/Connection.model';
import { retryWithExponentialBackoff } from '../../utils/retryWithExponentialBackoff';
import { logger } from '../../utils/logger';

export class TikTokChatProvider implements ChatProvider {
    private connectingUsers: Set<string> = new Set();
    private activeConnections: Map<string, WebcastPushConnection> = new Map();
    private retryCleanup: Map<string, () => void> = new Map();
    private shouldReconnect: Map<string, boolean> = new Map();
    private transformer: TikTokEventTransformer;
    private connectionManager: TikTokConnectionManager;
    private eventListener: TikTokEventListener;

    constructor() {
        this.transformer = new TikTokEventTransformer();
        this.connectionManager = new TikTokConnectionManager();
        this.eventListener = new TikTokEventListener(this.transformer);
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to TikTok, skipping...');
            return;
        }

        this.connectingUsers.add(userId);

        try {
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'tiktok' }
            });

            if (!connection?.providerUsername) {
                this.connectingUsers.delete(userId);
                return;
            }

            const tiktokUsername = connection.providerUsername.replace(/^@+/, '');

            if (this.activeConnections.has(userId)) {
                logger.debug({ userId }, 'TikTok already active, refreshing state');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected');
                this.connectingUsers.delete(userId);
                return;
            }

            // Marcar que este usuario debe reconectar automáticamente
            this.shouldReconnect.set(userId, true);

            this.retryCleanup.get(userId)?.();

            const startConnection = async () => {
                try {
                    // Verificar si todavía debe reconectar
                    if (!this.shouldReconnect.get(userId)) {
                        logger.debug({ userId }, 'Reconnection disabled for user, stopping');
                        this.retryCleanup.get(userId)?.();
                        return;
                    }

                    const stillExists = await Connection.findOne({
                        where: { userId: String(userId), provider: 'tiktok' }
                    });
                    if (!stillExists) {
                        this.retryCleanup.get(userId)?.();
                        this.shouldReconnect.delete(userId);
                        return;
                    }

                    SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting');
                    logger.info({ username: tiktokUsername, userId }, 'Attempting TikTok connection');

                    try {
                        const tiktokConnection = await this.connectionManager.connect(tiktokUsername);
                        logger.info({ username: tiktokUsername, userId }, 'Connected to TikTok');
                        this.retryCleanup.get(userId)?.();

                        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected');

                        this.eventListener.setupListeners(userId, tiktokConnection, io);
                        this.setupDisconnectionHandler(userId, tiktokConnection, io);
                        this.activeConnections.set(userId, tiktokConnection);

                    } catch (error) {
                        if (this.retryCleanup.has(userId)) return;

                        const errorInfo = this.categorizeError(error, tiktokUsername);

                        // Log del error completo para debugging
                        logger.debug({
                            username: tiktokUsername,
                            userId,
                            errorType: errorInfo.type,
                            isPermanent: errorInfo.isPermanent,
                            errorMessage: String(error)
                        }, 'TikTok connection error details');

                        // Log según severidad del error
                        if (errorInfo.isPermanent) {
                            logger.warn({ username: tiktokUsername, userId, errorType: errorInfo.type }, errorInfo.logMessage);
                        } else {
                            logger.debug({ username: tiktokUsername, userId, errorType: errorInfo.type }, errorInfo.logMessage);
                        }

                        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', errorInfo.userMessage);

                        // Solo reintentar si el error es recuperable y debe reconectar
                        if (!errorInfo.isPermanent && this.shouldReconnect.get(userId)) {
                            logger.debug({ userId, username: tiktokUsername }, 'Starting retry with exponential backoff');
                            const cleanup = retryWithExponentialBackoff(startConnection, {
                                initialIntervalMs: 60000,      // Empezar con 1 minuto
                                multiplier: 2,                  // Duplicar cada vez
                                maxIntervalMs: 1800000,         // Máximo 30 minutos
                                onError: (err, attempt, nextRetryMs) => {
                                    logger.debug(
                                        {
                                            username: tiktokUsername,
                                            attempt,
                                            nextRetryMs,
                                            nextRetryMinutes: Math.round(nextRetryMs / 60000)
                                        },
                                        'TikTok connection failed, retrying with exponential backoff'
                                    );
                                },
                                onRetry: (attempt, delayMs) => {
                                    logger.debug(
                                        {
                                            username: tiktokUsername,
                                            attempt,
                                            delayMs,
                                            delayMinutes: Math.round(delayMs / 60000)
                                        },
                                        'Retrying TikTok connection...'
                                    );
                                }
                            });
                            this.retryCleanup.set(userId, cleanup);
                        } else {
                            // Error permanente - no tiene sentido reintentar
                            this.connectingUsers.delete(userId);
                            this.shouldReconnect.delete(userId);
                        }
                    }
                } finally {
                    this.connectingUsers.delete(userId);
                }
            };

            void startConnection();
        } catch (error) {
            this.connectingUsers.delete(userId);
            throw error;
        }
    }

    private categorizeError(error: unknown, username: string): {
        type: string;
        isPermanent: boolean;
        userMessage: string;
        logMessage: string;
    } {
        const errorStr = String(error);

        // Type guard para errores con aggregateErrors
        interface ErrorWithAggregates {
            aggregateErrors?: Array<{ message?: string }>;
        }

        const errorObj = error as ErrorWithAggregates;

        // Error de usuario no encontrado (permanente)
        if (errorStr.includes('user_not_found') || errorStr.includes('User not found') ||
            (errorObj?.aggregateErrors?.some((e) => e?.message?.includes('user_not_found')))) {
            return {
                type: 'user_not_found',
                isPermanent: true,
                userMessage: `Usuario @${username} no encontrado. Verifica el nombre de usuario.`,
                logMessage: 'TikTok user not found'
            };
        }

        // Error de cuenta privada/oculta (permanente)
        if (errorStr.includes('private') || errorStr.includes('hidden')) {
            return {
                type: 'private_account',
                isPermanent: true,
                userMessage: 'Cuenta privada u oculta. No se puede acceder.',
                logMessage: 'TikTok account is private or hidden'
            };
        }

        // Error de bloqueo por TikTok (temporal pero requiere atención)
        if (errorStr.includes('SIGI_STATE') || errorStr.includes('blocked by TikTok')) {
            return {
                type: 'blocked',
                isPermanent: false,
                userMessage: 'Bloqueado temporalmente por TikTok. Reintentando...',
                logMessage: 'Temporarily blocked by TikTok'
            };
        }

        // Usuario no está en vivo (temporal - recuperable)
        if (errorStr.includes('not_live') || errorStr.includes('LIVE_ACCESS_ROOM_ERROR')) {
            return {
                type: 'not_live',
                isPermanent: false,
                userMessage: 'Usuario no está en vivo. Esperando...',
                logMessage: 'TikTok user is not live'
            };
        }

        // Timeout de conexión (temporal - recuperable)
        if (errorStr.includes('timeout') || errorStr.includes('Connection timeout')) {
            return {
                type: 'timeout',
                isPermanent: false,
                userMessage: 'Tiempo de espera agotado. Reintentando...',
                logMessage: 'Connection timeout'
            };
        }

        // Error genérico (temporal - recuperable)
        return {
            type: 'unknown',
            isPermanent: false,
            userMessage: 'Error al conectar. Reintentando...',
            logMessage: 'Unknown TikTok connection error'
        };
    }

    private setupDisconnectionHandler(userId: string, connection: WebcastPushConnection, io: Server): void {
        connection.on('disconnected', async () => {
            logger.info({ userId }, 'TikTok disconnected');
            this.activeConnections.delete(userId);

            // Solo reconectar si está habilitado y la conexión todavía existe en BD
            if (this.shouldReconnect.get(userId)) {
                const stillExists = await Connection.findOne({
                    where: { userId: String(userId), provider: 'tiktok' }
                });

                if (stillExists) {
                    logger.debug({ userId }, 'TikTok disconnected, attempting reconnection');
                    void this.connect(userId, io);
                } else {
                    logger.debug({ userId }, 'TikTok connection removed from DB, not reconnecting');
                    this.shouldReconnect.delete(userId);
                }
            } else {
                logger.debug({ userId }, 'TikTok reconnection disabled, not reconnecting');
            }
        });

        connection.on('error', (err: Error) => {
            logger.error({ err, userId }, 'TikTok connection error');
            connection.disconnect();
        });
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTokChatProvider: Starting disconnect');

        // IMPORTANTE: Remover listeners PRIMERO para evitar que el evento 'disconnected'
        // se dispare después de que eliminemos shouldReconnect
        const connection = this.activeConnections.get(userId);
        if (connection) {
            logger.debug({ userId }, 'TikTokChatProvider: Removing event listeners');
            connection.removeAllListeners('disconnected'); // Evitar reconexión automática
            connection.removeAllListeners('error');
        } else {
            logger.debug({ userId }, 'TikTokChatProvider: No active connection found');
        }

        // Ahora es seguro deshabilitar reconexión automática
        logger.debug({ userId }, 'TikTokChatProvider: Disabling auto-reconnect');
        this.shouldReconnect.delete(userId);

        // Cancelar cualquier reintento pendiente
        const cleanup = this.retryCleanup.get(userId);
        if (cleanup) {
            logger.debug({ userId }, 'TikTokChatProvider: Canceling retry cleanup');
            cleanup();
            this.retryCleanup.delete(userId);
        } else {
            logger.debug({ userId }, 'TikTokChatProvider: No retry cleanup found to cancel');
        }

        // Finalmente desconectar y limpiar
        if (connection) {
            logger.debug({ userId }, 'TikTokChatProvider: Disconnecting WebSocket');
            await this.connectionManager.disconnect(connection);
            this.activeConnections.delete(userId);
        }

        this.connectingUsers.delete(userId);

        logger.info({ userId }, 'TikTokChatProvider: Disconnect completed');
    }
}
