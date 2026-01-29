/** Encuestador de chat de YouTube con distribución gradual de mensajes */

import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeChatMessage, YouTubeChatMessagesResponse } from '../../../types/youtube.types';
import { MessageDeduplicator } from '../../../utils/messageDeduplicate';
import { PollingManager } from '../PollingManager';
import { YouTubeEventTransformer } from '../transformers/YouTubeEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

export class YouTubeChatPoller {
    private polling: PollingManager = new PollingManager();
    private nextPageTokens: Map<string, string> = new Map();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();
    private transformer: YouTubeEventTransformer;
    private activeTimeouts: Map<string, Set<NodeJS.Timeout>> = new Map();

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

        if (!this.activeTimeouts.has(userId)) {
            this.activeTimeouts.set(userId, new Set());
        }
        const userTimeouts = this.activeTimeouts.get(userId)!;

        messages.forEach((item, index) => {
            const timeoutId = setTimeout(() => {
                const normalizedMessage = this.transformer.transformMessage(item);
                SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'youtube');

                userTimeouts.delete(timeoutId);
            }, delayBetweenMessages * index);

            userTimeouts.add(timeoutId);
        });

        logger.debug(
            { userId, messageCount: messages.length, delayBetweenMessages, activeTimeouts: userTimeouts.size },
            'Distributing YouTube messages gradually'
        );
    }

    async startPolling(userId: string, liveChatId: string, accessToken: string, io: Server): Promise<void> {
        const dedup = new MessageDeduplicator();
        this.deduplicators.set(userId, dedup);

        const pollTask = async () => {
            if (!this.polling.isRunning(userId)) return;

            try {
                const response = await axios.get<YouTubeChatMessagesResponse>('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                    params: { liveChatId, part: 'snippet,authorDetails', pageToken: this.nextPageTokens.get(userId) },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (!this.polling.isRunning(userId)) return;

                const { items, nextPageToken, pollingIntervalMillis } = response.data;
                if (nextPageToken) this.nextPageTokens.set(userId, nextPageToken);

                const newMessages = items?.filter((item: YouTubeChatMessage) =>
                    !dedup.isDuplicate(item.id)
                ) || [];

                const currentInterval = pollingIntervalMillis || YouTubePollingConfig.CHAT_POLLING_INTERVAL;
                this.distributeMessages(newMessages, userId, io, currentInterval);

                if (pollingIntervalMillis && this.polling.isRunning(userId)) {
                    this.polling.start(userId, pollTask, pollingIntervalMillis);
                }

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    if (status === 401 || status === 403 || status === 404) {
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
        this.deduplicators.delete(userId);
        this.nextPageTokens.delete(userId);

        const userTimeouts = this.activeTimeouts.get(userId);
        if (userTimeouts && userTimeouts.size > 0) {
            logger.debug(
                { userId, cancelledTimeouts: userTimeouts.size },
                'Cancelling active timeouts for disconnected user'
            );

            userTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            userTimeouts.clear();
            this.activeTimeouts.delete(userId);
        }
    }
}
