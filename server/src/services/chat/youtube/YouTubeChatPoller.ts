/**
 * Encuestador de Chat de YouTube
 * Responsabilidad: Hacer polling de mensajes de chat en vivo
 */

import axios from 'axios';
import { Server } from 'socket.io';
import { YouTubeChatMessage, YouTubeChatMessagesResponse } from '../../../types/youtube.types';
import { MessageDeduplicator } from '../../../utils/messageDeduplicate';
import { PollingManager } from '../PollingManager';
import { YouTubeEventTransformer } from '../transformers/YouTubeEventTransformer';
import { logger } from '../../../utils/logger';

export class YouTubeChatPoller {
    private polling: PollingManager = new PollingManager();
    private nextPageTokens: Map<string, string> = new Map();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();
    private transformer: YouTubeEventTransformer;

    constructor() {
        this.transformer = new YouTubeEventTransformer();
    }

    async startPolling(userId: string, liveChatId: string, accessToken: string, io: Server): Promise<void> {
        const dedup = new MessageDeduplicator();
        this.deduplicators.set(userId, dedup);

        const pollTask = async () => {
            try {
                const response = await axios.get<YouTubeChatMessagesResponse>('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                    params: { liveChatId, part: 'snippet,authorDetails', pageToken: this.nextPageTokens.get(userId) },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const { items, nextPageToken, pollingIntervalMillis } = response.data;
                if (nextPageToken) this.nextPageTokens.set(userId, nextPageToken);

                items?.forEach((item: YouTubeChatMessage) => {
                    if (dedup.isDuplicate(item.id)) return;

                    const normalizedMessage = this.transformer.transformMessage(item);
                    io.to(userId).emit('chat_message', normalizedMessage);
                });

                // Update interval if provided by API
                if (pollingIntervalMillis) {
                    this.polling.start(userId, pollTask, pollingIntervalMillis);
                }

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error({ message: errorMessage }, 'YouTube chat polling error');
            }
        };

        this.polling.start(userId, pollTask, 5000);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
        this.deduplicators.delete(userId);
        this.nextPageTokens.delete(userId);
    }
}
