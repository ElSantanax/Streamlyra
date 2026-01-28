/**
 * Ciclo de Vida de Conexión de TikTok
 * Responsabilidad: Gestionar el proceso completo de conexión y desconexión
 */

import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { Connection } from '../../../models/Connection.model';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { TikTokConnectionManager } from './TikTokConnectionManager';
import { TikTokEventListener } from './TikTokEventListener';
import { TikTokConnectionStateManager } from './TikTokConnectionStateManager';
import { TikTokErrorHandler } from './TikTokErrorHandler';
import { TikTokReconnectionStrategy } from './TikTokReconnectionStrategy';

export class TikTokConnectionLifecycle {
    constructor(
        private readonly connectionManager: TikTokConnectionManager,
        private readonly eventListener: TikTokEventListener,
        private readonly stateManager: TikTokConnectionStateManager,
        private readonly errorHandler: TikTokErrorHandler,
        private readonly reconnectionStrategy: TikTokReconnectionStrategy
    ) {}

    async validateAndGetUsername(userId: string): Promise<string | null> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });

        if (!connection?.providerUsername) {
            return null;
        }

        return connection.providerUsername.replace(/^@+/, '');
    }

    async checkConnectionStillExists(userId: string): Promise<boolean> {
        const stillExists = await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });
        return !!stillExists;
    }

    async attemptConnection(
        userId: string,
        username: string,
        io: Server,
        onConnect: (connection: WebcastPushConnection) => void
    ): Promise<void> {
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting');
        logger.info({ username, userId }, 'Attempting TikTok connection');

        const tiktokConnection = await this.connectionManager.connect(username);
        logger.info({ username, userId }, 'Connected to TikTok');

        this.stateManager.executeAndRemoveRetryCleanup(userId);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected');

        this.eventListener.setupListeners(userId, tiktokConnection, io);
        onConnect(tiktokConnection);
    }

    handleConnectionError(
        error: unknown,
        userId: string,
        username: string,
        io: Server,
        retryFn: () => Promise<void>
    ): void {
        if (this.stateManager.hasRetryCleanup(userId)) return;

        const errorInfo = this.errorHandler.categorizeError(error, username);

        // Log del error completo para debugging
        logger.debug({
            username,
            userId,
            errorType: errorInfo.type,
            isPermanent: errorInfo.isPermanent,
            errorMessage: String(error)
        }, 'TikTok connection error details');

        // Log según severidad del error
        if (errorInfo.isPermanent) {
            logger.warn({ username, userId, errorType: errorInfo.type }, errorInfo.logMessage);
        } else {
            logger.debug({ username, userId, errorType: errorInfo.type }, errorInfo.logMessage);
        }

        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', errorInfo.userMessage);

        // Solo reintentar si el error es recuperable y debe reconectar
        if (!errorInfo.isPermanent && this.stateManager.shouldAutoReconnect(userId)) {
            const cleanup = this.reconnectionStrategy.startRetry(retryFn, username);
            this.stateManager.setRetryCleanup(userId, cleanup);
        } else {
            // Error permanente - no tiene sentido reintentar
            this.stateManager.removeConnecting(userId);
            this.stateManager.disableAutoReconnect(userId);
        }
    }

    setupDisconnectionHandler(userId: string, connection: WebcastPushConnection, io: Server, reconnectFn: () => void): void {
        connection.on('disconnected', async () => {
            logger.info({ userId }, 'TikTok disconnected');
            this.stateManager.removeActiveConnection(userId);

            // Solo reconectar si está habilitado y la conexión todavía existe en BD
            if (this.stateManager.shouldAutoReconnect(userId)) {
                const stillExists = await this.checkConnectionStillExists(userId);

                if (stillExists) {
                    logger.debug({ userId }, 'TikTok disconnected, attempting reconnection');
                    reconnectFn();
                } else {
                    logger.debug({ userId }, 'TikTok connection removed from DB, not reconnecting');
                    this.stateManager.disableAutoReconnect(userId);
                }
            } else {
                logger.debug({ userId }, 'TikTok reconnection disabled, not reconnecting');
            }
        });

        connection.on('error', (error: Error) => {
            logger.error({ error, userId }, 'TikTok connection error');
            connection.disconnect();
        });
    }

    async performDisconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTokChatProvider: Starting disconnect');

        // IMPORTANTE: Remover listeners PRIMERO para evitar que el evento 'disconnected'
        // se dispare después de que eliminemos shouldReconnect
        const connection = this.stateManager.getActiveConnection(userId);
        if (connection) {
            logger.debug({ userId }, 'TikTokChatProvider: Removing event listeners');
            connection.removeAllListeners('disconnected'); // Evitar reconexión automática
            connection.removeAllListeners('error');
        } else {
            logger.debug({ userId }, 'TikTokChatProvider: No active connection found');
        }

        // Ahora es seguro deshabilitar reconexión automática
        logger.debug({ userId }, 'TikTokChatProvider: Disabling auto-reconnect');
        this.stateManager.disableAutoReconnect(userId);

        // Cancelar cualquier reintento pendiente
        const cleanup = this.stateManager.getRetryCleanup(userId);
        if (cleanup) {
            logger.debug({ userId }, 'TikTokChatProvider: Canceling retry cleanup');
            cleanup();
            this.stateManager.executeAndRemoveRetryCleanup(userId);
        } else {
            logger.debug({ userId }, 'TikTokChatProvider: No retry cleanup found to cancel');
        }

        // Finalmente desconectar y limpiar
        if (connection) {
            logger.debug({ userId }, 'TikTokChatProvider: Disconnecting WebSocket');
            await this.connectionManager.disconnect(connection);
            this.stateManager.removeActiveConnection(userId);
        }

        this.stateManager.removeConnecting(userId);

        logger.info({ userId }, 'TikTokChatProvider: Disconnect completed');
    }
}
