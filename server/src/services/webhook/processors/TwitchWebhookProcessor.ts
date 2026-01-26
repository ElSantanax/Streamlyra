/**
 * Procesador de Webhooks de Twitch
 * Responsabilidad: Procesar eventos de webhook de Twitch EventSub
 * 
 * NOTA: Twitch usa EventSub para webhooks, pero actualmente
 * los eventos se obtienen mediante tmi.js en TwitchChatProvider.
 * Este procesador es un placeholder para futuras implementaciones.
 */

import { Server } from 'socket.io';
import { logger } from '../../../utils/logger';

interface TwitchWebhookPayload {
    [key: string]: unknown;
}

export class TwitchWebhookProcessor {
    constructor(private io: Server) {}

    async process(_payload: TwitchWebhookPayload): Promise<void> {
        logger.info({}, 'Twitch webhook event received (not yet implemented)');
        // TODO: Implementar procesamiento de eventos de Twitch EventSub si es necesario
    }
}
