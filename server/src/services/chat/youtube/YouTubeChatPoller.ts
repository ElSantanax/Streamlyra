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
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

export class YouTubeChatPoller {
    private polling: PollingManager = new PollingManager();
    private nextPageTokens: Map<string, string> = new Map();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();
    private transformer: YouTubeEventTransformer;

    constructor() {
        this.transformer = new YouTubeEventTransformer();
    }

    /**
     * Distribuye mensajes gradualmente para evitar saturación
     * En lugar de enviar todos los mensajes de golpe, los distribuye
     * uniformemente durante el intervalo de polling
     */
    private distributeMessages(
        messages: YouTubeChatMessage[],
        userId: string,
        io: Server,
        intervalMs: number
    ): void {
        if (messages.length === 0) return;

        // Si hay pocos mensajes (≤3), enviarlos inmediatamente
        if (messages.length <= 3) {
            messages.forEach(item => {
                const normalizedMessage = this.transformer.transformMessage(item);
                io.to(userId).emit('chat_message', normalizedMessage);
            });
            return;
        }

        // Si hay muchos mensajes, distribuirlos gradualmente
        // Usar el 80% del intervalo para distribuir (dejar 20% de margen)
        const distributionWindow = intervalMs * 0.8;
        const delayBetweenMessages = distributionWindow / messages.length;

        messages.forEach((item, index) => {
            setTimeout(() => {
                const normalizedMessage = this.transformer.transformMessage(item);
                io.to(userId).emit('chat_message', normalizedMessage);
            }, delayBetweenMessages * index);
        });

        logger.debug(
            { userId, messageCount: messages.length, delayBetweenMessages },
            'Distributing YouTube messages gradually'
        );
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

                // Filtrar mensajes duplicados
                const newMessages = items?.filter((item: YouTubeChatMessage) => 
                    !dedup.isDuplicate(item.id)
                ) || [];

                // Distribuir mensajes gradualmente en lugar de enviarlos todos de golpe
                const currentInterval = pollingIntervalMillis || YouTubePollingConfig.CHAT_POLLING_INTERVAL;
                this.distributeMessages(newMessages, userId, io, currentInterval);

                // Update interval if provided by API
                if (pollingIntervalMillis) {
                    this.polling.start(userId, pollTask, pollingIntervalMillis);
                }

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error({ message: errorMessage }, 'YouTube chat polling error');
            }
        };

        // Usa configuración centralizada para cuotas de YouTube
        // YouTube puede sugerir un intervalo diferente en pollingIntervalMillis
        this.polling.start(userId, pollTask, YouTubePollingConfig.CHAT_POLLING_INTERVAL);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
        this.deduplicators.delete(userId);
        this.nextPageTokens.delete(userId);
    }
}
