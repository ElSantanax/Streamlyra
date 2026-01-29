/** Descubridor de broadcast en vivo de YouTube con detección de cuota agotada */

import axios from 'axios';
import { YouTubeBroadcast, YouTubeBroadcastResponse } from '../../../types/youtube.types';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

export class YouTubeBroadcastDiscovery {
    async findLiveBroadcast(accessToken: string): Promise<YouTubeBroadcast | null> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.BROADCAST_LIST;

        if (!quotaManager.hasQuota(cost)) {
            logger.warn('YouTube broadcast discovery paused: Quota exhausted');
            throw new Error('YOUTUBE_QUOTA_EXCEEDED');
        }

        try {
            const response = await axios.get<YouTubeBroadcastResponse>('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
                params: { part: 'snippet,status,id', mine: true, broadcastType: 'all', maxResults: 1 },
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            quotaManager.consumeQuota(cost);

            const broadcast = response.data.items?.find((b: YouTubeBroadcast) =>
                b.status.lifeCycleStatus === 'live'
            ) || null;

            if (broadcast) {
                logger.info({ broadcastId: broadcast.id }, 'Live broadcast found');
            }

            return broadcast;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                const errorData = error.response.data as { error?: { errors?: Array<{ reason?: string }> } };
                const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');

                if (isQuotaError) {
                    quotaManager.markAsExhausted();
                    logger.warn('YouTube API quota exceeded during discovery');
                    throw new Error('YOUTUBE_QUOTA_EXCEEDED');
                }
            }

            logger.error({ err: error }, 'Error discovering YouTube broadcast');
            return null;
        }
    }
}
