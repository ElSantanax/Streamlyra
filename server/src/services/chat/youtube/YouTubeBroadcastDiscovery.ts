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
                params: {
                    part: 'snippet',
                    broadcastStatus: 'active',
                    maxResults: 10
                },
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            quotaManager.consumeQuota(cost);

            const items = response.data.items || [];

            // Diagnóstico para ver qué devuelve la API
            logger.info({
                count: items.length,
                statuses: items.map(i => i.status?.lifeCycleStatus)
            }, 'YouTube Discovery Diagnostic');

            // Seleccionar solo broadcasts con chat activo
            const broadcast = items.find(b => b.snippet?.liveChatId) || null;

            if (broadcast) {
                logger.info({
                    id: broadcast.id,
                    status: broadcast.status?.lifeCycleStatus,
                    chatId: !!broadcast.snippet?.liveChatId
                }, 'YouTube broadcast discovered');
            }

            return broadcast;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as {
                    error?: {
                        errors?: Array<{ reason?: string }>;
                    };
                } | undefined;

                logger.error({
                    status,
                    errorData,
                    platform: 'youtube',
                    context: 'YouTubeBroadcastDiscovery'
                }, 'YouTube Discovery API Error');

                if (status === 403 && errorData?.error?.errors?.some((e) => e.reason === 'quotaExceeded')) {
                    quotaManager.markAsExhausted();
                    throw new Error('YOUTUBE_QUOTA_EXCEEDED');
                }
            }

            logger.error({ err: error }, 'Error discovering YouTube broadcast');
            return null;
        }
    }
}
