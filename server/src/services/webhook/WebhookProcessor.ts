/** Procesador de webhooks con orquestación por plataforma */

import { Server } from 'socket.io';
import { KickChatMessagePayload } from '../../types/kick.types';
import { WebhookProcessorFactory } from './WebhookProcessorFactory';

interface WebhookProcessorInterface {
    process(payload: unknown): Promise<void>;
}

export class WebhookProcessor {
    constructor(private io: Server) { }

    async processKickEvent(payload: KickChatMessagePayload): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('kick', this.io) as WebhookProcessorInterface;
        await processor.process(payload);
    }
}
