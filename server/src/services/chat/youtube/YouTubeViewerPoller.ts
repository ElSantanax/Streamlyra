/** Encuestador de espectadores de YouTube con polling de estadísticas en vivo */

import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeVideoResponse } from '../../../types/youtube.types';
import { PollingManager } from '../shared/PollingManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';
import { ConnectionService } from '../../connection/ConnectionService';
import { YouTubeStreamContext } from '../../../models/YouTubeStreamContext.model';

export class YouTubeViewerPoller {
    private polling: PollingManager = new PollingManager();

    constructor(private connectionService: ConnectionService) { }

    startPolling(userId: string, broadcastId: string, io: Server, onFatalError?: () => void): void {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.VIDEO_DETAILS;

        const pollTask = async () => {
            if (!this.polling.isRunning(userId)) return;

            if (!(await quotaManager.hasQuota(cost))) {
                logger.warn({ userId }, 'YouTube viewer polling paused: Quota exhausted');
                this.stopPolling(userId);
                SafeSocketEmitter.emitConnectionStatus(
                    io,
                    userId,
                    'youtube',
                    'error',
                    'Cuotas agotadas'
                );
                onFatalError?.();
                return;
            }

            try {
                const validToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
                if (!validToken) {
                    logger.error({ userId }, 'YouTube viewer polling aborted: Could not refresh token');
                    this.stopPolling(userId);
                    onFatalError?.();
                    return;
                }

                const response = await axios.get<YouTubeVideoResponse>('https://www.googleapis.com/youtube/v3/videos', {
                    params: { part: 'liveStreamingDetails', id: broadcastId },
                    headers: { Authorization: `Bearer ${validToken}` },
                    timeout: 10000
                });

                await quotaManager.consumeQuota(cost);

                const video = response.data.items?.[0];
                const viewerCount = video?.liveStreamingDetails?.concurrentViewers || '0';
                const isStillLive = !!video;

                SafeSocketEmitter.emitViewersUpdate(
                    io,
                    userId,
                    'youtube',
                    parseInt(viewerCount),
                    isStillLive
                );

                const adaptiveInterval = await quotaManager.getAdaptiveInterval(YouTubePollingConfig.VIEWER_POLLING_INTERVAL);
                if (this.polling.isRunning(userId)) {
                    this.polling.start(userId, pollTask, adaptiveInterval);
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                if (axios.isAxiosError(error) && error.response) {
                    const status = error.response.status;

                    if (status === 403) {
                        const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
                        const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');

                        if (isQuotaError) {
                            await quotaManager.markAsExhausted();
                            logger.warn({ userId }, 'YouTube viewer polling stopped: Quota exceeded error');
                            this.stopPolling(userId);
                            return;
                        }
                    }

                    if (status === 401 || status === 404) {
                        logger.warn({ userId, status, message: errorMessage }, 'YouTube viewer polling stopped due to fatal API error');

                        if (status === 404) {
                            try {
                                await YouTubeStreamContext.update(
                                    { isActive: false, endedAt: new Date() },
                                    { where: { videoId: broadcastId, isActive: true } }
                                );
                                logger.info({ broadcastId }, 'YouTube stream context marked as inactive (Viewer 404 detected)');

                                SafeSocketEmitter.emitConnectionStatus(
                                    io,
                                    userId,
                                    'youtube',
                                    'waiting_stream',
                                    'Stream finalizado'
                                );
                            } catch (e) {
                                logger.error({ err: e }, 'Error marking stream context as inactive in ViewerPoller');
                            }
                        }

                        this.stopPolling(userId);
                        onFatalError?.();
                        return;
                    }
                }

                logger.error({ message: errorMessage }, 'YouTube viewer polling error');
            }
        };

        this.polling.start(userId, pollTask, YouTubePollingConfig.VIEWER_POLLING_INTERVAL);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
    }
}
