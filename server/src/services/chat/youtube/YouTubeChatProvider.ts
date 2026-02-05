import { Server } from 'socket.io';
import { ChatProvider } from '../shared/ChatProvider';
import { YouTubeBroadcastDiscovery } from './YouTubeBroadcastDiscovery';
import { YouTubeConnectionStateManager } from './YouTubeConnectionStateManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { ConnectionService } from '../../connection/ConnectionService';
import { retryWithInterval } from '../../../utils/retryWithInterval';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

export class YouTubeChatProvider implements ChatProvider {
    private broadcastDiscovery: YouTubeBroadcastDiscovery;
    private stateManager: YouTubeConnectionStateManager;

    constructor(private connectionService: ConnectionService) {
        this.broadcastDiscovery = new YouTubeBroadcastDiscovery();
        this.stateManager = new YouTubeConnectionStateManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        // 1. Evitar peticiones simultáneas
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'YouTube: Connection already in progress, skipping');
            return;
        }

        // 2. Si ya está conectado y activo, solo informar
        if (this.stateManager.hasActiveConnection(userId)) {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected', 'Conectado');
            return;
        }

        this.stateManager.setConnecting(userId, true);

        try {
            const connection = await this.getConnection(userId);
            if (!connection) {
                logger.warn({ userId }, 'YouTube: No account found in DB');
                return;
            }

            // 3. Limpiar rastro anterior
            await this.disconnect(userId);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting', 'Buscando...');

            // 4. Iniciar auto-discovery
            await this.setupAutoDiscovery(userId, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'YouTube: Failed to setup connection');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Error');
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }

    async boostDiscovery(userId: string, io: Server): Promise<void> {
        logger.info({ userId }, 'YouTube: Manual boost requested');

        this.stateManager.setManualMode(userId, true);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting', 'Buscando...');

        try {
            await this.attemptDiscovery(userId, io);
        } catch {
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'youtube',
                'waiting_stream',
                'Sin Live público'
            );
        }
    }

    private async getConnection(userId: string): Promise<Connection | null> {
        return await Connection.findOne({
            where: { userId: String(userId), provider: 'youtube' }
        });
    }

    private async setupAutoDiscovery(userId: string, io: Server): Promise<void> {
        const tryConnect = async () => {
            if (this.stateManager.getAutoAttempts(userId) >= YouTubePollingConfig.AUTO_DISCOVERY_MAX_ATTEMPTS) {
                this.handleAutoDiscoveryExhausted(userId, io);
                return;
            }
            await this.attemptDiscovery(userId, io);
        };

        const cleanup = retryWithInterval(tryConnect, {
            intervalMs: YouTubePollingConfig.AUTO_DISCOVERY_INTERVAL,
            onError: (err) => this.handleDiscoveryError(err, userId, io)
        });

        this.stateManager.setDiscoveryCleanup(userId, cleanup);

        // Primer intento inmediato
        await tryConnect().catch(() => { });
    }

    private async attemptDiscovery(userId: string, io: Server): Promise<void> {
        this.stateManager.incrementAutoAttempts(userId);

        const accessToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
        if (!accessToken) throw new Error('Token inválido');

        const broadcast = await this.broadcastDiscovery.findLiveBroadcast(accessToken);
        if (!broadcast) throw new Error('Broadcast not found');

        await this.handleBroadcastFound(userId, broadcast, accessToken, io);
    }

    private async handleBroadcastFound(
        userId: string,
        broadcast: { id?: string; snippet?: { liveChatId?: string } },
        accessToken: string,
        io: Server
    ): Promise<void> {
        const liveChatId = broadcast?.snippet?.liveChatId;
        const broadcastId = broadcast?.id;

        if (liveChatId) {
            logger.info({ userId, liveChatId }, 'YouTube: Active broadcast discovered');

            // Parar discovery
            this.stateManager.setDiscoveryCleanup(userId, () => { });

            // Persistir chatroomId
            await Connection.update(
                { chatroomId: liveChatId },
                { where: { userId: String(userId), provider: 'youtube' } }
            );

            this.stateManager.markAsConnected(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected', 'Conectado', true);

            // Iniciar pollers
            this.stateManager.getChatPoller(userId).startPolling(userId, liveChatId, accessToken, io);
            if (broadcastId) {
                this.stateManager.getViewerPoller(userId).startPolling(userId, broadcastId, accessToken, io);
            }
        }
    }

    private handleAutoDiscoveryExhausted(userId: string, io: Server): void {
        this.stateManager.setManualMode(userId, true);
        SafeSocketEmitter.emitConnectionStatus(
            io,
            userId,
            'youtube',
            'waiting_stream',
            'Sin Live detectado'
        );
    }

    private handleDiscoveryError(err: unknown, userId: string, io: Server): void {
        if (err instanceof Error && err.message === 'YOUTUBE_QUOTA_EXCEEDED') {
            logger.warn({ userId }, 'YouTube: Quota exceeded during discovery');
            this.stateManager.clearState(userId);
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'youtube',
                'error',
                'Límite diario'
            );
        }
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'YouTube: Disconnecting and cleaning state');
        this.stateManager.clearState(userId);
    }
}
