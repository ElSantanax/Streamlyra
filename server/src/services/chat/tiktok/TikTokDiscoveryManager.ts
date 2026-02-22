import { Server } from 'socket.io';
import crypto from 'crypto';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { TikTokConnection } from '../../../types/tiktok.types';
import { TikTokConnectionManager } from './TikTokConnectionManager';
import { TikTokConnectionStateManager } from './TikTokConnectionStateManager';
import { TikTokErrorHandler } from './TikTokErrorHandler';
import { TikTokEventListener } from './TikTokEventListener';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { retryWithIntervalAndLimit } from '../../../utils/retryWithInterval';
import { logger } from '../../../utils/logger';
import { TikTokPollingConfig } from '../../../config/tiktok.polling.config';

export class TikTokDiscoveryManager {

    constructor(
        private readonly connectionManager: TikTokConnectionManager,
        private readonly stateManager: TikTokConnectionStateManager,
        private readonly errorHandler: TikTokErrorHandler,
        private readonly eventListener: TikTokEventListener
    ) { }

    async setupAutoDiscovery(userId: string, username: string, io: Server, onReconnect: () => void): Promise<void> {
        const flowId = this.generateFlowId();
        this.stateManager.setFlowId(userId, flowId);

        const tryConnect = async () => {
            await this.attemptDiscovery(userId, username, flowId, io, onReconnect);
        };

        const cleanup = retryWithIntervalAndLimit(tryConnect, {
            intervalMs: TikTokPollingConfig.AUTO_DISCOVERY_INTERVAL_MS,
            maxAttempts: TikTokPollingConfig.AUTO_DISCOVERY_MAX_ATTEMPTS,
            onRetry: () => {
                const attempt = this.stateManager.getAutoAttempts(userId);
                logger.info({ userId, username, attempt }, `TikTok: Retrying discovery (${attempt}/${TikTokPollingConfig.AUTO_DISCOVERY_MAX_ATTEMPTS})`);
            },
            onError: (err) => this.handleDiscoveryError(err, userId, username, io),
            onMaxAttemptsReached: () => this.handleAutoDiscoveryExhausted(userId, io)
        });

        this.stateManager.setDiscoveryCleanup(userId, cleanup);
        await tryConnect().catch(() => { });
    }

    async boostDiscovery(userId: string, username: string, io: Server, onReconnect: () => void): Promise<void> {
        const flowId = this.generateFlowId();
        this.stateManager.setFlowId(userId, flowId);

        try {
            await this.attemptDiscovery(userId, username, flowId, io, onReconnect);
        } catch {
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'tiktok',
                'waiting_stream',
                'Live no detectado'
            );
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }

    private async attemptDiscovery(
        userId: string,
        username: string,
        flowId: string,
        io: Server,
        onReconnect: () => void
    ): Promise<void> {
        if (!this.isFlowValid(userId, flowId)) {
            logger.debug({ userId, username, flowId }, 'TikTok: Aborting stale discovery attempt');
            return;
        }

        logger.info({ userId, username, flowId }, 'TikTok: Attempting to connect to Live...');
        this.stateManager.incrementAutoAttempts(userId);

        const tiktokConnection = await this.connectionManager.connect(username);
        const isStillValid = await this.isConnectionStillValid(userId, flowId, username);

        if (!isStillValid) {
            logger.info({ userId, username, flowId }, 'TikTok: Flow invalidated during connection, aborting zombie');
            this.connectionManager.disconnect(tiktokConnection);
            return;
        }

        this.stateManager.stopDiscoveryLoop(userId);
        this.stateManager.setActiveConnection(userId, tiktokConnection);
        this.stateManager.setConnecting(userId, false);

        SafeSocketEmitter.emitConnectionStatus(
            io,
            userId,
            'tiktok',
            'connected',
            'Conectado',
            this.eventListener.isStreamConfirmed(userId)
        );

        this.eventListener.setupListeners(userId, tiktokConnection, io);
        this.setupDisconnectionHandler(userId, username, tiktokConnection, flowId, onReconnect);
    }

    private handleAutoDiscoveryExhausted(userId: string, io: Server): void {
        this.stateManager.setManualMode(userId, true);
        this.stateManager.setConnecting(userId, false);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'waiting_stream', 'Sin Live');
    }

    private handleDiscoveryError(err: unknown, userId: string, username: string, io: Server): void {
        const errorInfo = this.errorHandler.categorizeError(err, username);

        if (errorInfo.type === 'not_live') {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'waiting_stream', 'Sin Live');
        }

        if (errorInfo.isPermanent) {
            logger.error({ userId, username, type: errorInfo.type }, 'TikTok: Permanent error, stopping');
            this.stateManager.clearState(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', errorInfo.userMessage);
        }
    }

    private setupDisconnectionHandler(
        userId: string,
        username: string,
        connection: TikTokLiveConnection,
        flowId: string,
        onReconnect: () => void
    ): void {
        (connection as unknown as TikTokConnection).on('disconnected', async () => {
            if (this.stateManager.getFlowId(userId) !== flowId) {
                logger.debug({ userId, flowId }, 'TikTok: Ignoring disconnected zombie');
                return;
            }

            logger.info({ userId }, 'TikTok: Connection lost');
            this.stateManager.removeActiveConnection(userId);

            const connectionRecord = await Connection.findOne({
                where: { userId: String(userId), provider: 'tiktok' }
            });

            if (connectionRecord) {
                const currentUsername = connectionRecord.providerUsername.replace(/^@+/, '');
                if (currentUsername === username) {
                    setTimeout(onReconnect, TikTokPollingConfig.RECONNECTION_DELAY_MS);
                }
            }
        });
    }

    private generateFlowId(): string {
        return crypto.randomUUID();
    }

    private isFlowValid(userId: string, flowId: string): boolean {
        return this.stateManager.hasState(userId) &&
            this.stateManager.getFlowId(userId) === flowId;
    }

    private async isConnectionStillValid(
        userId: string,
        flowId: string,
        expectedUsername: string
    ): Promise<boolean> {
        const currentConnection = await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });

        const currentBoundUsername = currentConnection?.providerUsername
            ? currentConnection.providerUsername.replace(/^@+/, '')
            : null;

        return this.isFlowValid(userId, flowId) &&
            currentBoundUsername === expectedUsername;
    }
}