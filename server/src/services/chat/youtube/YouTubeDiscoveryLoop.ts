import { Server } from 'socket.io';
import { YouTubeBroadcast } from '../../../types/youtube.types';
import { YouTubeConnectionStateManager } from './YouTubeConnectionStateManager';
import { YouTubeBroadcastDiscovery } from './YouTubeBroadcastDiscovery';
import { ConnectionService } from '../../connection/ConnectionService';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeError, YouTubeErrorType } from './YouTubeError';

export class YouTubeDiscoveryLoop {
    private broadcastDiscovery: YouTubeBroadcastDiscovery;

    constructor(
        private stateManager: YouTubeConnectionStateManager,
        private connectionService: ConnectionService,
        private onBroadcastFound: (userId: string, broadcast: YouTubeBroadcast, io: Server) => Promise<void>
    ) {
        this.broadcastDiscovery = new YouTubeBroadcastDiscovery();
    }

    async startAutoDiscovery(userId: string, account: { providerId: string }, io: Server): Promise<void> {
        let timeoutId: NodeJS.Timeout | null = null;
        let isStopped = false;

        const runDiscoveryLoop = async () => {
            if (isStopped || !this.stateManager.isConnecting(userId)) return;

            try {
                await this.attemptDiscovery(userId, account, io);
            } catch (err) {
                this.handleDiscoveryError(err, userId, io);

                const attempts = this.stateManager.getAutoAttempts(userId);

                if (attempts >= YouTubePollingConfig.AUTO_DISCOVERY_MAX_ATTEMPTS) {
                    this.handleAutoDiscoveryExhausted(userId, account, io);
                    return;
                }

                const baseInterval = YouTubePollingConfig.AUTO_DISCOVERY_INTERVAL;
                const multiplier = 1 + (0.5 * attempts);
                const adaptiveInterval = baseInterval * multiplier;

                logger.debug({ userId, attempts, nextIn: adaptiveInterval }, 'YouTube: Scheduling next discovery attempt');
                timeoutId = setTimeout(runDiscoveryLoop, adaptiveInterval);
            }
        };

        this.stateManager.setDiscoveryCleanup(userId, () => {
            isStopped = true;
            if (timeoutId) clearTimeout(timeoutId);
            logger.debug({ userId }, 'YouTube: Discovery loop stopped');
        });

        void runDiscoveryLoop();
    }

    async performManualDiscovery(userId: string, account: { providerId: string }, io: Server): Promise<void> {
        try {
            await this.attemptDiscovery(userId, account, io, true); // Manual = skipCache
        } catch (err) {
            if (YouTubeError.isYouTubeError(err) && err.type === YouTubeErrorType.BROADCAST_NOT_FOUND) {
                this.notifyStatus(io, userId, 'waiting_stream', 'Sin Live público');
            } else {
                this.handleDiscoveryError(err, userId, io);
            }
            throw err;
        }
    }

    private async attemptDiscovery(userId: string, account: { providerId: string }, io: Server, skipCache: boolean = false): Promise<void> {
        if (!this.stateManager.isManualMode(userId)) {
            this.stateManager.incrementAutoAttempts(userId);
        }

        const validToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
        if (!validToken) {
            throw new YouTubeError(YouTubeErrorType.INVALID_TOKEN, 'Token inválido o expirado');
        }

        const broadcast = await this.broadcastDiscovery.findLiveBroadcast(validToken, account.providerId, skipCache);

        if (!this.stateManager.isConnecting(userId) && !this.stateManager.isManualMode(userId)) {
            logger.info({ userId }, 'YouTube: Broadcast found but user already disconnected, aborting');
            return;
        }

        if (!broadcast) {
            throw new YouTubeError(YouTubeErrorType.BROADCAST_NOT_FOUND, 'No se encontró ningún broadcast activo');
        }

        await this.onBroadcastFound(userId, broadcast, io);
    }

    private handleDiscoveryError(err: unknown, userId: string, io: Server): void {
        const currentAttempt = this.stateManager.getAutoAttempts(userId);
        const maxAttempts = YouTubePollingConfig.AUTO_DISCOVERY_MAX_ATTEMPTS;

        if (YouTubeError.isYouTubeError(err)) {
            switch (err.type) {
                case YouTubeErrorType.QUOTA_EXCEEDED:
                    logger.warn({ userId }, 'YouTube: Quota exceeded during discovery');
                    this.stateManager.clearState(userId);
                    this.notifyStatus(io, userId, 'error', 'Cuotas agotadas');
                    break;

                case YouTubeErrorType.BROADCAST_NOT_FOUND:
                    if (!this.stateManager.isManualMode(userId)) {
                        logger.debug({ userId, attempt: `${currentAttempt}/${maxAttempts}` }, 'YouTube: Stream not found yet, retrying');
                        this.notifyStatus(
                            io,
                            userId,
                            'connecting',
                            `Buscando... (${currentAttempt}/${maxAttempts})`
                        );
                    }
                    break;

                case YouTubeErrorType.INVALID_TOKEN:
                    logger.warn({ userId }, 'YouTube: Invalid token during discovery');
                    this.stateManager.clearState(userId);
                    this.notifyStatus(io, userId, 'error', 'Token inválido');
                    break;

                default:
                    logger.error({ err, userId }, 'YouTube: Unexpected discovery error');
                    break;
            }
        } else {
            logger.error({ err, userId }, 'YouTube: Non-structured discovery error');
        }
    }

    private handleAutoDiscoveryExhausted(userId: string, account: { providerId: string }, io: Server): void {
        logger.info({ userId }, 'YouTube: Auto discovery exhausted, switching to STANDBY mode');

        this.stateManager.setWaitingMode(userId);
        this.notifyStatus(io, userId, 'waiting_stream', 'Esperando directo...', false);

        const STANDBY_INTERVAL = YouTubePollingConfig.AUTO_DISCOVERY_STANDBY_INTERVAL;
        let standbyTimer: NodeJS.Timeout | null = null;
        let isStandbyStopped = false;

        const runStandbyLoop = async () => {
            if (isStandbyStopped || !this.stateManager.isManualMode(userId)) return;

            try {
                await this.attemptDiscovery(userId, account, io);
            } catch (err) {
                if (isStandbyStopped || !this.stateManager.isManualMode(userId)) return;

                if (YouTubeError.isYouTubeError(err) && err.type === YouTubeErrorType.INVALID_TOKEN) {
                    this.notifyStatus(io, userId, 'error', 'Token inválido', false);
                    this.stateManager.clearState(userId);
                    return;
                }

                logger.debug({ userId }, 'YouTube: Standby check failed, waiting for next cycle');
                standbyTimer = setTimeout(runStandbyLoop, STANDBY_INTERVAL);
            }
        };

        this.stateManager.setDiscoveryCleanup(userId, () => {
            isStandbyStopped = true;
            if (standbyTimer) clearTimeout(standbyTimer);
            logger.debug({ userId }, 'YouTube: Standby loop stopped');
        });

        standbyTimer = setTimeout(runStandbyLoop, STANDBY_INTERVAL);
    }

    private notifyStatus(io: Server, userId: string, status: 'connecting' | 'waiting_stream' | 'connected' | 'disconnected' | 'error', message: string, isLive: boolean = false): void {
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', status, message, isLive);
    }
}