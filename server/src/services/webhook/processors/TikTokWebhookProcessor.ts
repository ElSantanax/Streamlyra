/**
 * Procesador de Webhooks de TikTok
 * Responsabilidad: Procesar eventos de webhook de TikTok
 * 
 * NOTA: TikTok usa WebSocket para eventos en vivo (tiktok-live-connector).
 * Los webhooks no son necesarios para chat en vivo.
 * Este procesador es un placeholder para futuras implementaciones.
 */

import { Server } from 'socket.io';
import { logger } from '../../../utils/logger';

interface TikTokWebhookPayload {
    [key: string]: unknown;
}

export class TikTokWebhookProcessor {
    constructor(private io: Server) {}

    async process(_payload: TikTokWebhookPayload): Promise<void> {
        logger.info({}, 'TikTok webhook event received (not yet implemented)');
        // TODO: Implementar procesamiento de eventos de TikTok si es necesario
    }
}
