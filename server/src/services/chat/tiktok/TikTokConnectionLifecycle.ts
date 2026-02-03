/** Ciclo de vida de conexión de TikTok con gestión completa de conexión y desconexión */

import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
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
    ) { }

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
        onConnect: (connection: TikTokLiveConnection) => void,
        isRetry: boolean = false
    ): Promise<void> {
        // Solo emitir "connecting" en el primer intento, no en los reintentos
        if (!isRetry) {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting');
            logger.info({ username, userId }, 'Attempting TikTok connection');
        } else {
            logger.debug({ username, userId }, 'Retrying TikTok connection (keeping waiting_stream state)');
        }

        try {
            const tiktokConnection = await this.connectionManager.connect(username);
            logger.info({ username, userId }, 'TikTok WebSocket established, waiting for stream to start');

            this.stateManager.executeAndRemoveRetryCleanup(userId);

            // Emitir waiting_stream en lugar de connected
            // Solo emitiremos connected cuando recibamos el primer evento de chat
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'waiting_stream', 'Usuario encontrado, esperando stream...');

            this.eventListener.setupListeners(userId, tiktokConnection, io);
            onConnect(tiktokConnection);
        } catch (error) {
            // Si el error es "not_live", emitir waiting_stream y luego lanzar el error para que se maneje el retry
            const errorInfo = this.errorHandler.categorizeError(error, username);

            if (errorInfo.type === 'not_live') {
                logger.debug({ username, userId }, 'User not live, entering waiting_stream state');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'waiting_stream', 'Usuario encontrado, esperando stream...');
            }

            // Re-lanzar el error para que se maneje en el catch externo
            throw error;
        }
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

        logger.debug({
            username,
            userId,
            errorType: errorInfo.type,
            isPermanent: errorInfo.isPermanent,
            errorMessage: String(error)
        }, 'TikTok connection error details');

        if (errorInfo.isPermanent) {
            logger.warn({ username, userId, errorType: errorInfo.type }, errorInfo.logMessage);
        } else {
            logger.debug({ username, userId, errorType: errorInfo.type }, errorInfo.logMessage);
        }

        // Solo emitir error si NO es "not_live" (ya emitimos waiting_stream en attemptConnection)
        if (errorInfo.type !== 'not_live') {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', errorInfo.userMessage);
        }

        if (!errorInfo.isPermanent && this.stateManager.shouldAutoReconnect(userId)) {
            const cleanup = this.reconnectionStrategy.startRetry(
                retryFn,
                username,
                () => {
                    // Callback cuando se alcanza el máximo de intentos
                    logger.info({ userId, username }, 'TikTok max retry attempts reached, notifying user');

                    SafeSocketEmitter.emitConnectionStatus(
                        io,
                        userId,
                        'tiktok',
                        'error',
                        'No se pudo conectar después de múltiples intentos. Por favor, verifica el nombre de usuario e intenta de nuevo.'
                    );

                    // Limpiar estado
                    this.stateManager.removeConnecting(userId);
                    this.stateManager.disableAutoReconnect(userId);
                    this.stateManager.executeAndRemoveRetryCleanup(userId);
                }
            );
            this.stateManager.setRetryCleanup(userId, cleanup);
        } else {
            this.stateManager.removeConnecting(userId);
            this.stateManager.disableAutoReconnect(userId);
        }
    }

    setupDisconnectionHandler(userId: string, connection: TikTokLiveConnection, io: Server, reconnectFn: () => void): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const conn = connection as any;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('disconnected', async () => {
            logger.info({ userId }, 'TikTok disconnected');
            this.stateManager.removeActiveConnection(userId);

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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        conn.on('error', (error: Error) => {
            logger.error({ error, userId }, 'TikTok connection error');
            connection.disconnect();
        });
    }

    async performDisconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTokChatProvider: Starting disconnect');

        const connection = this.stateManager.getActiveConnection(userId);
        if (connection) {
            logger.debug({ userId }, 'TikTokChatProvider: Removing all event listeners');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            const conn = connection as any;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            conn.removeAllListeners();
        } else {
            logger.debug({ userId }, 'TikTokChatProvider: No active connection found');
        }

        logger.debug({ userId }, 'TikTokChatProvider: Disabling auto-reconnect');
        this.stateManager.disableAutoReconnect(userId);

        const cleanup = this.stateManager.getRetryCleanup(userId);
        if (cleanup) {
            logger.debug({ userId }, 'TikTokChatProvider: Canceling retry cleanup');
            cleanup();
            this.stateManager.executeAndRemoveRetryCleanup(userId);
        } else {
            logger.debug({ userId }, 'TikTokChatProvider: No retry cleanup found to cancel');
        }

        if (connection) {
            logger.debug({ userId }, 'TikTokChatProvider: Disconnecting WebSocket');
            await this.connectionManager.disconnect(connection);
            this.stateManager.removeActiveConnection(userId);
        }

        this.stateManager.removeConnecting(userId);

        // Limpiar la confirmación de stream
        this.eventListener.clearStreamConfirmation(userId);

        logger.info({ userId }, 'TikTokChatProvider: Disconnect completed');
    }

    isStreamConfirmed(userId: string): boolean {
        return this.eventListener.isStreamConfirmed(userId);
    }
}
