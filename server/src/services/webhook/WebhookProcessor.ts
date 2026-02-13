/** Procesador de webhooks con orquestación por plataforma */

import { Server } from 'socket.io';
import { KickWebhookPayload } from '../../types/kick.types';
import { WebhookProcessorFactory } from './WebhookProcessorFactory';

interface WebhookProcessorInterface {
    process(payload: unknown, eventType?: string): Promise<void>;
}

export class WebhookProcessor {
    constructor(private io: Server) { }

    async processKickEvent(payload: KickWebhookPayload, eventType: string): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('kick', this.io) as WebhookProcessorInterface;
        await processor.process(payload, eventType);
    }

    async processTwitchEvent(payload: unknown, eventType: string): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('twitch', this.io) as WebhookProcessorInterface;
        await processor.process(payload, eventType);
    }
}
