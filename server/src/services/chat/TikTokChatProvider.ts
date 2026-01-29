/** Proveedor de chat de TikTok con orquestación de conexión WebSocket */

import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { TikTokConnectionManager } from './tiktok/TikTokConnectionManager';
import { TikTokEventListener } from './tiktok/TikTokEventListener';
import { TikTokEventTransformer } from './transformers/TikTokEventTransformer';
import { TikTokConnectionStateManager } from './tiktok/TikTokConnectionStateManager';
import { TikTokErrorHandler } from './tiktok/TikTokErrorHandler';
import { TikTokReconnectionStrategy } from './tiktok/TikTokReconnectionStrategy';
import { TikTokConnectionLifecycle } from './tiktok/TikTokConnectionLifecycle';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { logger } from '../../utils/logger';

export class TikTokChatProvider implements ChatProvider {
    private readonly stateManager: TikTokConnectionStateManager;
    private readonly lifecycle: TikTokConnectionLifecycle;

    constructor() {
        const transformer = new TikTokEventTransformer();
        const connectionManager = new TikTokConnectionManager();
        const eventListener = new TikTokEventListener(transformer);
        const errorHandler = new TikTokErrorHandler();
        const reconnectionStrategy = new TikTokReconnectionStrategy();

        this.stateManager = new TikTokConnectionStateManager();
        this.lifecycle = new TikTokConnectionLifecycle(
            connectionManager,
            eventListener,
            this.stateManager,
            errorHandler,
            reconnectionStrategy
        );
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'Already connecting to TikTok, skipping...');
            return;
        }

        this.stateManager.setConnecting(userId);

        try {
            const tiktokUsername = await this.lifecycle.validateAndGetUsername(userId);

            if (!tiktokUsername) {
                this.stateManager.removeConnecting(userId);
                return;
            }

            if (this.stateManager.hasActiveConnection(userId)) {
                logger.debug({ userId }, 'TikTok already active, refreshing state');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected');
                this.stateManager.removeConnecting(userId);
                return;
            }

            this.stateManager.enableAutoReconnect(userId);

            this.stateManager.executeAndRemoveRetryCleanup(userId);

            const startConnection = async () => {
                try {
                    if (!this.stateManager.shouldAutoReconnect(userId)) {
                        logger.debug({ userId }, 'Reconnection disabled for user, stopping');
                        this.stateManager.executeAndRemoveRetryCleanup(userId);
                        return;
                    }

                    const stillExists = await this.lifecycle.checkConnectionStillExists(userId);
                    if (!stillExists) {
                        this.stateManager.executeAndRemoveRetryCleanup(userId);
                        this.stateManager.disableAutoReconnect(userId);
                        return;
                    }

                    try {
                        await this.lifecycle.attemptConnection(
                            userId,
                            tiktokUsername,
                            io,
                            (connection) => {
                                this.lifecycle.setupDisconnectionHandler(
                                    userId,
                                    connection,
                                    io,
                                    () => void this.connect(userId, io)
                                );
                                this.stateManager.setActiveConnection(userId, connection);
                            }
                        );
                    } catch (error) {
                        if (this.stateManager.hasRetryCleanup(userId)) return;

                        this.lifecycle.handleConnectionError(
                            error,
                            userId,
                            tiktokUsername,
                            io,
                            startConnection
                        );
                    }
                } finally {
                    this.stateManager.removeConnecting(userId);
                }
            };

            void startConnection();
        } catch (error) {
            this.stateManager.removeConnecting(userId);
            throw error;
        }
    }

    async disconnect(userId: string): Promise<void> {
        await this.lifecycle.performDisconnect(userId);
    }
}
