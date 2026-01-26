/**
 * Procesador de Webhooks de YouTube
 * Responsabilidad: Procesar eventos de webhook de YouTube
 * 
 * NOTA: YouTube no usa webhooks para chat en vivo.
 * Los eventos se obtienen mediante HTTP polling en YouTubeChatPoller.
 * Este procesador es un placeholder para futuras implementaciones.
 */

import { Server } from 'socket.io';
import { logger } from '../../../utils/logger';

interface YouTubeWebhookPayload {
    [key: string]: unknown;
}

export class YouTubeWebhookProcessor {
    constructor(private io: Server) {}

    async process(_payload: YouTubeWebhookPayload): Promise<void> {
        logger.info({}, 'YouTube webhook event received (not yet implemented)');
        // TODO: Implementar procesamiento de eventos de YouTube si es necesario
    }
}
