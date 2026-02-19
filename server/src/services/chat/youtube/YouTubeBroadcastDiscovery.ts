import axios from 'axios';
import { YouTubeBroadcast, YouTubeBroadcastResponse } from '../../../types/youtube.types';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeStreamContext } from '../../../models/YouTubeStreamContext.model';
import { YouTubeError, YouTubeErrorType } from './YouTubeError';

export class YouTubeBroadcastDiscovery {
    async findLiveBroadcast(accessToken: string, channelId?: string, skipCache: boolean = false): Promise<YouTubeBroadcast | null> {
        if (channelId && !skipCache) {
            const context = await YouTubeStreamContext.findOne({
                where: { channelId, isActive: true }
            });

            if (context) {
                logger.debug({ channelId, videoId: context.videoId }, 'Using cached YouTube stream context (Quota saved)');
                return {
                    id: context.videoId,
                    snippet: {
                        liveChatId: context.liveChatId,
                        title: 'Cached Stream Context',
                        channelId: context.channelId,
                        publishedAt: context.startedAt.toISOString(),
                        description: '',
                        thumbnails: { default: { url: '' }, medium: { url: '' }, high: { url: '' } },
                        channelTitle: '',
                    },
                    status: {
                        lifeCycleStatus: 'live'
                    }
                } as unknown as YouTubeBroadcast;
            }
        }

        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.BROADCAST_LIST;

        if (!(await quotaManager.hasQuota(cost))) {
            logger.warn('YouTube broadcast discovery paused: Quota exhausted');
            throw new YouTubeError(YouTubeErrorType.QUOTA_EXCEEDED, 'YouTube quota exceeded');
        }

        try {
            const response = await axios.get<YouTubeBroadcastResponse>('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
                params: {
                    part: 'snippet,status',
                    mine: true,
                    broadcastType: 'all',
                    maxResults: 10
                },
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 10000
            });

            await quotaManager.consumeQuota(cost);

            const items = response.data.items || [];

            logger.debug({
                platform: 'youtube',
                foundCount: items.length,
                broadcasts: items.map(i => ({
                    id: i.id,
                    title: i.snippet?.title,
                    chatId: !!i.snippet?.liveChatId,
                    status: i.status?.lifeCycleStatus
                }))
            }, 'YouTube: Broadcast Discovery Detailed Diagnostic');

            const liveBroadcasts = items.filter(b =>
                b.snippet?.liveChatId &&
                (b.status?.lifeCycleStatus === 'live' || b.status?.lifeCycleStatus === 'active' || b.status?.lifeCycleStatus === 'liveStarting')
            );

            const broadcast = liveBroadcasts[0] || null;

            if (broadcast) {
                logger.info({
                    id: broadcast.id,
                    status: broadcast.status?.lifeCycleStatus,
                    chatId: !!broadcast.snippet?.liveChatId
                }, 'YouTube: Broadcast discovered successfully');
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
                    await quotaManager.markAsExhausted();
                    throw new YouTubeError(YouTubeErrorType.QUOTA_EXCEEDED, 'YouTube quota exceeded', error);
                }
            }

            if (error instanceof YouTubeError) throw error;

            logger.error({ err: error }, 'Error discovering YouTube broadcast');
            return null;
        }
    }
}