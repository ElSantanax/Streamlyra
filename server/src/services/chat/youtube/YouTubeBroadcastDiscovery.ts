/** Descubridor de broadcast en vivo de YouTube con detección de cuota agotada */

import axios from 'axios';
import { YouTubeBroadcast, YouTubeBroadcastResponse } from '../../../types/youtube.types';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeStreamContext } from '../../../models/YouTubeStreamContext.model';

export class YouTubeBroadcastDiscovery {
    async findLiveBroadcast(accessToken: string, channelId?: string): Promise<YouTubeBroadcast | null> {
        // 1. Verificar contexto persistente primero (Optimización Quota)
        if (channelId) {
            const context = await YouTubeStreamContext.findOne({
                where: { channelId, isActive: true }
            });

            if (context) {
                logger.debug({ channelId, videoId: context.videoId }, 'Using cached YouTube stream context (Quota saved)');
                // Devolver estructura compatible con YouTubeBroadcast
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
            throw new Error('YOUTUBE_QUOTA_EXCEEDED');
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

            // Diagnóstico detallado para entender por qué no se detecta
            logger.info({
                platform: 'youtube',
                foundCount: items.length,
                broadcasts: items.map(i => ({
                    id: i.id,
                    title: i.snippet?.title,
                    chatId: !!i.snippet?.liveChatId,
                    status: i.status?.lifeCycleStatus
                }))
            }, 'YouTube: Broadcast Discovery Detailed Diagnostic');

            // Seleccionar solo broadcasts con chat activo y que estén realmente "live" o "active"
            // Nota: Google a veces devuelve status 'active' para lo que nosotros llamamos 'live'
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
                    throw new Error('YOUTUBE_QUOTA_EXCEEDED');
                }
            }

            logger.error({ err: error }, 'Error discovering YouTube broadcast');
            return null;
        }
    }
}
