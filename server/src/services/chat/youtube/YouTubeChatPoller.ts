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
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

export class YouTubeChatPoller {
    private polling: PollingManager = new PollingManager();
    private nextPageTokens: Map<string, string> = new Map();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();
    private transformer: YouTubeEventTransformer;
    // Almacenar referencias a timeouts activos para poder cancelarlos
    // Esto previene memory leaks cuando un usuario se desconecta
    private activeTimeouts: Map<string, Set<NodeJS.Timeout>> = new Map();

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
                SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'youtube');
            });
            return;
        }

        // Si hay muchos mensajes, distribuirlos gradualmente
        // Usar el 80% del intervalo para distribuir (dejar 20% de margen)
        const distributionWindow = intervalMs * 0.8;
        const delayBetweenMessages = distributionWindow / messages.length;

        // Inicializar Set de timeouts para este usuario si no existe
        if (!this.activeTimeouts.has(userId)) {
            this.activeTimeouts.set(userId, new Set());
        }
        const userTimeouts = this.activeTimeouts.get(userId)!;

        messages.forEach((item, index) => {
            // Guardar referencia al timeout para poder cancelarlo después
            const timeoutId = setTimeout(() => {
                const normalizedMessage = this.transformer.transformMessage(item);
                SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'youtube');

                // Remover timeout completado del Set
                userTimeouts.delete(timeoutId);
            }, delayBetweenMessages * index);

            // Agregar timeout al Set de timeouts activos
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
            // Verificar si el polling sigue activo antes de empezar
            if (!this.polling.isRunning(userId)) return;

            try {
                const response = await axios.get<YouTubeChatMessagesResponse>('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                    params: { liveChatId, part: 'snippet,authorDetails', pageToken: this.nextPageTokens.get(userId) },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                // Verificar de nuevo después de la llamada asíncrona (race condition protection)
                if (!this.polling.isRunning(userId)) return;

                const { items, nextPageToken, pollingIntervalMillis } = response.data;
                if (nextPageToken) this.nextPageTokens.set(userId, nextPageToken);

                // Filtrar mensajes duplicados
                const newMessages = items?.filter((item: YouTubeChatMessage) =>
                    !dedup.isDuplicate(item.id)
                ) || [];

                // Distribuir mensajes gradualmente en lugar de enviarlos todos de golpe
                const currentInterval = pollingIntervalMillis || YouTubePollingConfig.CHAT_POLLING_INTERVAL;
                this.distributeMessages(newMessages, userId, io, currentInterval);

                // Update interval if provided by API - Solo si seguimos activos
                if (pollingIntervalMillis && this.polling.isRunning(userId)) {
                    this.polling.start(userId, pollTask, pollingIntervalMillis);
                }

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                // Si es un error de autenticación o permisos (401, 403) o recurso no encontrado (404)
                // lo mejor es detener el polling para no saturar los logs y ahorrar cuota
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

        // Usa configuración centralizada para cuotas de YouTube
        // YouTube puede sugerir un intervalo diferente en pollingIntervalMillis
        this.polling.start(userId, pollTask, YouTubePollingConfig.CHAT_POLLING_INTERVAL);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
        this.deduplicators.delete(userId);
        this.nextPageTokens.delete(userId);

        // Cancelar todos los timeouts activos para este usuario
        // Esto previene memory leaks y emisiones a usuarios desconectados
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
