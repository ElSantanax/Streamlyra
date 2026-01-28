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

interface WebhookProcessorInterface {
    process(payload: unknown): Promise<void>;
}

export class WebhookProcessor {
    constructor(private io: Server) { }

    /**
     * Procesa evento de webhook de Kick
     * @param payload - Payload del evento de Kick
     */
    async processKickEvent(payload: KickChatMessagePayload): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('kick', this.io) as WebhookProcessorInterface;
        await processor.process(payload);
    }
}
