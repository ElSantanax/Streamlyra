/**
 * Procesador de Webhooks
 * Responsabilidad: Orquestar procesamiento de webhooks por plataforma
 * 
 * IMPORTANTE: Cada plataforma tiene su propia lógica de procesamiento
 * porque tienen diferentes estructuras de datos y eventos.
 */

import { Server } from 'socket.io';
import { KickChatMessagePayload } from '../../types/kick.types';
import { WebhookProcessorFactory } from './WebhookProcessorFactory';

interface YouTubeWebhookPayload {
    [key: string]: unknown;
}

interface TwitchWebhookPayload {
    [key: string]: unknown;
}

interface TikTokWebhookPayload {
    [key: string]: unknown;
}

interface WebhookProcessorInterface {
    process(payload: unknown): Promise<void>;
}

export class WebhookProcessor {
    constructor(private io: Server) {}

    /**
     * Procesa evento de webhook de Kick
     * @param payload - Payload del evento de Kick
     */
    async processKickEvent(payload: KickChatMessagePayload): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('kick', this.io) as WebhookProcessorInterface;
        await processor.process(payload);
    }

    /**
     * Procesa evento de webhook de YouTube
     * @param payload - Payload del evento de YouTube
     */
    async processYouTubeEvent(payload: YouTubeWebhookPayload): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('youtube', this.io) as WebhookProcessorInterface;
        await processor.process(payload);
    }

    /**
     * Procesa evento de webhook de Twitch
     * @param payload - Payload del evento de Twitch
     */
    async processTwitchEvent(payload: TwitchWebhookPayload): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('twitch', this.io) as WebhookProcessorInterface;
        await processor.process(payload);
    }

    /**
     * Procesa evento de webhook de TikTok
     * @param payload - Payload del evento de TikTok
     */
    async processTikTokEvent(payload: TikTokWebhookPayload): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('tiktok', this.io) as WebhookProcessorInterface;
        await processor.process(payload);
    }
}
