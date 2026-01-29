/** Encuestador de espectadores de YouTube con polling de estadísticas en vivo */

import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeVideoResponse } from '../../../types/youtube.types';
import { PollingManager } from '../PollingManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';

export class YouTubeViewerPoller {
    private polling: PollingManager = new PollingManager();

    startPolling(userId: string, broadcastId: string, accessToken: string, io: Server): void {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.VIDEO_DETAILS;

        this.polling.start(userId, async () => {
            if (!quotaManager.hasQuota(cost)) {
                logger.warn({ userId }, 'YouTube viewer polling paused: Quota exhausted');
                this.stopPolling(userId);
                return;
            }

            try {
                const response = await axios.get<YouTubeVideoResponse>('https://www.googleapis.com/youtube/v3/videos', {
                    params: { part: 'liveStreamingDetails', id: broadcastId },
                    headers: { Authorization: `Bearer ${accessToken}` },
                    timeout: 10000
                });

                quotaManager.consumeQuota(cost);

                const video = response.data.items?.[0];
                const viewerCount = video?.liveStreamingDetails?.concurrentViewers || '0';

                SafeSocketEmitter.emitViewersUpdate(
                    io,
                    userId,
                    'youtube',
                    parseInt(viewerCount)
                );
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                if (axios.isAxiosError(error) && error.response) {
                    const status = error.response.status;

                    if (status === 403) {
                        const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
                        const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');

                        if (isQuotaError) {
                            quotaManager.markAsExhausted();
                            logger.warn({ userId }, 'YouTube viewer polling stopped: Quota exceeded error');
                            this.stopPolling(userId);
                            return;
                        }
                    }

                    if (status === 401 || status === 404) {
                        logger.warn({ userId, status, message: errorMessage }, 'YouTube viewer polling stopped due to fatal API error');
                        this.stopPolling(userId);
                        return;
                    }
                }

                logger.error({ message: errorMessage }, 'YouTube viewer polling error');
            }
        }, YouTubePollingConfig.VIEWER_POLLING_INTERVAL);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
    }
}
