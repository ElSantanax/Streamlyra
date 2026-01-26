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
            } catch (error) {
                logger.error({ err: error }, 'YouTube viewer polling error');
            }
        }, YouTubePollingConfig.VIEWER_POLLING_INTERVAL);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
    }
}
