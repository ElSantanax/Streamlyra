/** Proveedor de chat de YouTube con discovery de broadcasts y gestión de cuotas automática */

import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { YouTubeBroadcastDiscovery } from './youtube/YouTubeBroadcastDiscovery';
import { YouTubeChatPoller } from './youtube/YouTubeChatPoller';
import { YouTubeViewerPoller } from './youtube/YouTubeViewerPoller';
import { YouTubeDiscoveryManager } from './youtube/YouTubeDiscoveryManager';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { Connection } from '../../models/Connection.model';
import { ConnectionService } from '../connection/ConnectionService';
import { retryWithInterval } from '../../utils/retryWithInterval';
import { logger } from '../../utils/logger';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';

export class YouTubeChatProvider implements ChatProvider {
    private broadcastDiscovery: YouTubeBroadcastDiscovery;
    private chatPoller: YouTubeChatPoller;
    private viewerPoller: YouTubeViewerPoller;
    private discoveryManager: YouTubeDiscoveryManager;

    constructor(private connectionService: ConnectionService) {
        this.broadcastDiscovery = new YouTubeBroadcastDiscovery();
        this.chatPoller = new YouTubeChatPoller();
        this.viewerPoller = new YouTubeViewerPoller();
        this.discoveryManager = new YouTubeDiscoveryManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.discoveryManager.isConnecting(userId)) {
            logger.debug({ userId }, 'Already connecting to YouTube, skipping...');
            return;
        }

        if (this.discoveryManager.hasActiveDiscovery(userId)) {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');
            return;
        }

        this.discoveryManager.markAsConnecting(userId);

        try {
            const connection = await this.getConnection(userId);
            if (!connection) {
                return;
            }

            await this.disconnect(userId);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting');

            await this.setupDiscovery(userId, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'Error setting up YouTube connection');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Error de configuración');
        } finally {
            this.discoveryManager.unmarkAsConnecting(userId);
        }
    }

    private async getConnection(userId: string): Promise<Connection | null> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'youtube' }
        });

        if (!connection) {
            this.discoveryManager.unmarkAsConnecting(userId);
        }

        return connection;
    }

    private async setupDiscovery(userId: string, io: Server): Promise<void> {
        const tryConnect = async () => {
            await this.attemptDiscovery(userId, io);
        };

        const cleanup = retryWithInterval(tryConnect, {
            intervalMs: YouTubePollingConfig.DISCOVERY_POLLING_INTERVAL,
            onError: (err) => this.handleDiscoveryError(err, userId, io)
        });

        this.discoveryManager.registerDiscovery(userId, cleanup);

        await tryConnect().catch((err) => {
            logger.debug({ userId, err }, 'Initial YouTube connection attempt failed - continuing in background');
        });
    }

    private async attemptDiscovery(userId: string, io: Server): Promise<void> {
        if (!this.discoveryManager.shouldContinueDiscovery(userId, io)) {
            return;
        }

        logger.debug({ userId }, 'YouTube discovery attempt...');

        const stillExists = await Connection.findOne({
            where: { userId: String(userId), provider: 'youtube' }
        });
        if (!stillExists) {
            this.discoveryManager.stopDiscovery(userId);
            return;
        }

        const accessToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
        if (!accessToken) {
            return;
        }

        const attempts = this.discoveryManager.incrementAttempts(userId);

        const broadcast = await this.broadcastDiscovery.findLiveBroadcast(accessToken);
        if (!broadcast) {
            throw new Error('No broadcast found');
        }

        await this.handleBroadcastFound(userId, broadcast, accessToken, io, attempts);
    }

    private async handleBroadcastFound(
        userId: string,
        broadcast: { id?: string; snippet?: { liveChatId?: string } },
        accessToken: string,
        io: Server,
        attempts: number
    ): Promise<void> {
        const liveChatId = broadcast?.snippet?.liveChatId;
        const broadcastId = broadcast?.id;

        if (liveChatId) {
            logger.info({ liveChatId, userId, attempts }, 'YouTube live detected');

            this.discoveryManager.stopDiscovery(userId);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');

            this.chatPoller.startPolling(userId, liveChatId, accessToken, io);
            if (broadcastId) {
                this.viewerPoller.startPolling(userId, broadcastId, accessToken, io);
            }
        }
    }

    private handleDiscoveryError(err: unknown, userId: string, io: Server): void {
        if (err instanceof Error && err.message === 'YOUTUBE_QUOTA_EXCEEDED') {
            this.discoveryManager.notifyQuotaExceeded(io, userId);
        } else {
            logger.debug({ userId, err }, 'YouTube discovery retry failed');
        }
    }

    async disconnect(userId: string): Promise<void> {
        this.discoveryManager.stopDiscovery(userId);
        this.chatPoller.stopPolling(userId);
        this.viewerPoller.stopPolling(userId);
    }
}
