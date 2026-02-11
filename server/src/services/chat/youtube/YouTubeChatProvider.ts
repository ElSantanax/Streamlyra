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
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'YouTube: Connection already in progress, skipping');
            return;
        }

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

            await this.disconnect(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting', 'Buscando...');

            // Iniciar auto-discovery (no bloqueante) para no retrasar el retorno de la función
            void this.setupAutoDiscovery(userId, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'YouTube: Failed to setup connection');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Error');
            this.stateManager.setConnecting(userId, false);
        }
    }

    async boostDiscovery(userId: string, io: Server): Promise<void> {
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'YouTube: Boost requested but already connecting/discovering');
            return;
        }

        logger.info({ userId }, 'YouTube: Manual boost requested');

        this.stateManager.setConnecting(userId, true);
        this.stateManager.setManualMode(userId, true);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting', 'Buscando...');

        try {
            await this.attemptDiscovery(userId, io);
        } catch {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'waiting_stream', 'Sin Live público');
        } finally {
            this.stateManager.setConnecting(userId, false);
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
        await tryConnect().catch(() => { });
    }

    private async attemptDiscovery(userId: string, io: Server): Promise<void> {
        this.stateManager.incrementAutoAttempts(userId);

        const accessToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
        if (!accessToken) throw new Error('Token inválido');

        const broadcast = await this.broadcastDiscovery.findLiveBroadcast(accessToken);

        // Race condition check: ¿El usuario canceló la conexión mientras la API de YT respondía?
        if (!this.stateManager.isConnecting(userId) && !this.stateManager.isManualMode(userId)) {
            logger.info({ userId }, 'YouTube: Broadcast found but user already disconnected, aborting');
            return;
        }

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
            
            this.stateManager.setDiscoveryCleanup(userId, () => { });

            await Connection.update(
                { chatroomId: liveChatId },
                { where: { userId: String(userId), provider: 'youtube' } }
            );

            this.stateManager.markAsConnected(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected', 'Conectado', true);

            this.stateManager.getChatPoller(userId).startPolling(userId, liveChatId, accessToken, io);
            if (broadcastId) {
                this.stateManager.getViewerPoller(userId).startPolling(userId, broadcastId, accessToken, io);
            }

            this.stateManager.setConnecting(userId, false);
        }
    }

    private handleAutoDiscoveryExhausted(userId: string, io: Server): void {
        this.stateManager.setConnecting(userId, false);
        this.stateManager.setManualMode(userId, true);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'waiting_stream', 'Sin Live detectado');
    }

    private handleDiscoveryError(err: unknown, userId: string, io: Server): void {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        if (errorMessage === 'YOUTUBE_QUOTA_EXCEEDED') {
            logger.warn({ userId }, 'YouTube: Quota exceeded during discovery');
            this.stateManager.clearState(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Cuotas agotadas');
        } else if (errorMessage === 'Broadcast not found' || errorMessage === 'Token inválido') {
            // Errores de flujo normal durante el polling de búsqueda
            logger.debug({ userId, error: errorMessage }, 'YouTube: Expected discovery error');
        } else {
            logger.error({ err, userId }, 'YouTube: Unexpected discovery error');
        }
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'YouTube: Disconnecting and cleaning state');
        try {
            this.stateManager.clearState(userId);
        } catch (error) {
            logger.error({ err: error, userId }, 'YouTube: Error during disconnection');
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }
}