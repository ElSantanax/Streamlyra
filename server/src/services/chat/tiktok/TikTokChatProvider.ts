import { Server } from 'socket.io';
import { ChatProvider } from '../shared/ChatProvider';
import { TikTokConnectionManager } from './TikTokConnectionManager';
import { TikTokEventListener } from './TikTokEventListener';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokConnectionStateManager } from './TikTokConnectionStateManager';
import { TikTokErrorHandler } from './TikTokErrorHandler';
import { TikTokDiscoveryManager } from './TikTokDiscoveryManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { logger } from '../../../utils/logger';

export class TikTokChatProvider implements ChatProvider {
    private readonly stateManager: TikTokConnectionStateManager;
    private readonly connectionManager: TikTokConnectionManager;
    private readonly eventListener: TikTokEventListener;
    private readonly errorHandler: TikTokErrorHandler;
    private readonly discovery: TikTokDiscoveryManager;

    constructor() {
        const transformer = new TikTokEventTransformer();
        this.connectionManager = new TikTokConnectionManager();
        this.eventListener = new TikTokEventListener(transformer);
        this.errorHandler = new TikTokErrorHandler();
        this.stateManager = new TikTokConnectionStateManager();

        this.discovery = new TikTokDiscoveryManager(
            this.connectionManager,
            this.stateManager,
            this.errorHandler,
            this.eventListener
        );
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'TikTok: Connection already in progress, skipping');
            return;
        }

        if (this.stateManager.hasActiveConnection(userId)) {
            this.emitCurrentConnectionStatus(userId, io);
            return;
        }

        this.stateManager.setConnecting(userId, true);

        try {
            const connection = await this.getConnection(userId);
            if (!connection || !connection.providerUsername) {
                logger.warn({ userId }, 'TikTok: No account connected in DB');
                this.stateManager.setConnecting(userId, false);
                return;
            }

            const username = this.normalizeUsername(connection.providerUsername);

            await this.clearInternalState(userId);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting', 'Buscando...');
            await this.discovery.setupAutoDiscovery(
                userId,
                username,
                io,
                () => this.connect(userId, io)
            );

        } catch (error) {
            logger.error({ err: error, userId }, 'TikTok: Failed to setup connection flow');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', 'Error al iniciar conexión');
            this.stateManager.setConnecting(userId, false);
        }
    }

    async boostDiscovery(userId: string, io: Server): Promise<void> {
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'TikTok: Boost requested but already connecting/discovering');
            return;
        }

        logger.info({ userId }, 'TikTok: Manual boost requested');

        const connection = await this.getConnection(userId);
        if (!connection || !connection.providerUsername) return;

        const username = this.normalizeUsername(connection.providerUsername);

        this.stateManager.setManualMode(userId, true);
        this.stateManager.setConnecting(userId, true);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting', 'Buscando...');

        await this.discovery.boostDiscovery(
            userId,
            username,
            io,
            () => this.connect(userId, io)
        );
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTok: Force disconnect requested');
        await this.clearInternalState(userId);
    }

    private async getConnection(userId: string): Promise<Connection | null> {
        return await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });
    }

    private normalizeUsername(username: string): string {
        return username.replace(/^@+/, '');
    }

    private getCurrentConnectionStatus(userId: string): {
        status: 'connected' | 'waiting_stream';
        message: string | undefined;
        isLive: boolean;
    } {
        const isLive = this.eventListener.isStreamConfirmed(userId);
        const status = isLive ? 'connected' : 'waiting_stream';
        const message = status === 'waiting_stream' ? 'Sin Live' : undefined;

        return { status, message, isLive };
    }

    private emitCurrentConnectionStatus(userId: string, io: Server): void {
        const { status, message, isLive } = this.getCurrentConnectionStatus(userId);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', status, message, isLive);
    }

    private async clearInternalState(userId: string): Promise<void> {
        try {
            const active = this.stateManager.getActiveConnection(userId);
            if (active) {
                active.removeAllListeners();
                this.connectionManager.disconnect(active);
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'TikTok: Error during client disconnection');
        } finally {
            this.stateManager.clearState(userId);
            this.eventListener.clearStreamConfirmation(userId);
        }
    }

    async onAccountDeleted(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTok: Permanent account deletion cleanup');
        await this.clearInternalState(userId);
    }
}