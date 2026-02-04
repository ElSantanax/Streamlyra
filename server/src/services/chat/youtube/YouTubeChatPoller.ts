/** Encuestador de chat de YouTube con distribución gradual de mensajes */

import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeChatMessage, YouTubeChatMessagesResponse } from '../../../types/youtube.types';
import { PollingManager } from '../shared/PollingManager';
import { YouTubeEventTransformer } from '../transformers/YouTubeEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';

export class YouTubeChatPoller {
    private polling: PollingManager = new PollingManager();
    private nextPageToken?: string;
    private transformer: YouTubeEventTransformer;
    private activeTimeouts: Set<NodeJS.Timeout> = new Set();

    constructor() {
        this.transformer = new YouTubeEventTransformer();
    }

    private distributeMessages(
        messages: YouTubeChatMessage[],
        userId: string,
        io: Server,
        intervalMs: number
    ): void {
        if (messages.length === 0) return;

        if (messages.length <= 3) {
            messages.forEach(item => {
                const normalizedMessage = this.transformer.transformMessage(item);
                SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'youtube');
            });
            return;
        }

        const distributionWindow = intervalMs * 0.8;
        const delayBetweenMessages = distributionWindow / messages.length;

        messages.forEach((item, index) => {
            const timeoutId = setTimeout(() => {
                const normalizedMessage = this.transformer.transformMessage(item);
                SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'youtube');

                this.activeTimeouts.delete(timeoutId);
            }, delayBetweenMessages * index);

            this.activeTimeouts.add(timeoutId);
        });

        logger.debug(
            { userId, messageCount: messages.length, delayBetweenMessages, activeTimeouts: this.activeTimeouts.size },
            'Distributing YouTube messages gradually'
        );
    }

    async startPolling(userId: string, liveChatId: string, accessToken: string, io: Server): Promise<void> {
        const pollTask = async () => {
            if (!this.polling.isRunning(userId)) return;

            const quotaManager = YouTubeQuotaManager.getInstance();
            const cost = YouTubePollingConfig.OPERATION_COSTS.CHAT_MESSAGE_LIST;

            if (!quotaManager.hasQuota(cost)) {
                logger.warn({ userId }, 'YouTube chat polling paused: Quota exhausted');
                this.stopPolling(userId);
                SafeSocketEmitter.emitError(
                    io,
                    userId,
                    'YOUTUBE_QUOTA_EXHAUSTED',
                    'La cuota de YouTube se ha agotado. El chat se reanudará mañana.',
                    'youtube'
                );
                return;
            }

            try {
                const response = await axios.get<YouTubeChatMessagesResponse>('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                    params: { liveChatId, part: 'snippet,authorDetails', pageToken: this.nextPageToken },
                    headers: { Authorization: `Bearer ${accessToken}` },
                    timeout: 10000
                });

                quotaManager.consumeQuota(cost);

                if (!this.polling.isRunning(userId)) return;

                const { items, nextPageToken, pollingIntervalMillis } = response.data;
                if (nextPageToken) this.nextPageToken = nextPageToken;

                const newMessages = items || [];

                const currentInterval = pollingIntervalMillis || YouTubePollingConfig.CHAT_POLLING_INTERVAL;
                const adaptiveInterval = quotaManager.getAdaptiveInterval(currentInterval);

                this.distributeMessages(newMessages, userId, io, adaptiveInterval);

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
                            quotaManager.markAsExhausted();
                            logger.warn({ userId }, 'YouTube chat polling stopped: Quota exceeded error');
                            this.stopPolling(userId);
                            return;
                        }
                    }

                    if (status === 401 || status === 404) {
                        logger.warn({ userId, status, message: errorMessage }, 'YouTube chat polling stopped due to fatal API error');
                        this.stopPolling(userId);
                        return;
                    }
                }

                logger.error({ message: errorMessage }, 'YouTube chat polling error');
            }
        };

        this.polling.start(userId, pollTask, YouTubePollingConfig.CHAT_POLLING_INTERVAL);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
        this.nextPageToken = undefined;

        if (this.activeTimeouts.size > 0) {
            logger.debug(
                { userId, cancelledTimeouts: this.activeTimeouts.size },
                'Cancelling active timeouts for YouTube poller'
            );

            this.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.activeTimeouts.clear();
        }
    }
}
