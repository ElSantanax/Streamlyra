/**
 * Encuestador de Espectadores de YouTube
 * Responsabilidad: Hacer polling de espectadores en vivo
 */

import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeVideoResponse } from '../../../types/youtube.types';
import { PollingManager } from '../PollingManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

export class YouTubeViewerPoller {
    private polling: PollingManager = new PollingManager();

    startPolling(userId: string, broadcastId: string, accessToken: string, io: Server): void {
        this.polling.start(userId, async () => {
            try {
                const response = await axios.get<YouTubeVideoResponse>('https://www.googleapis.com/youtube/v3/videos', {
                    params: { part: 'liveStreamingDetails', id: broadcastId },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

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

                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    if (status === 401 || status === 403 || status === 404) {
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
