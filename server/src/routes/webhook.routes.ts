/**
 * Rutas de Webhooks
 * Responsabilidad: Definir endpoints de webhooks
 * 
 * IMPORTANTE: Cada plataforma tiene su propio webhook con validación específica:
 * - Kick: RSA-SHA256 (implementado)
 * - YouTube: Placeholder (futuro)
 * - Twitch: Placeholder (futuro)
 * 
 * Cada ruta tiene su propio middleware de validación porque:
 * - Diferentes headers
 * - Diferentes métodos de verificación de firma
 * - Diferentes estructuras de payload
 * 
 * La inyección de dependencias ocurre en server.ts
 */

import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { validateKickWebhook, validateYouTubeWebhook, validateTwitchWebhook } from '../middleware/webhook.middleware';
import { logger } from '../utils/logger';

/**
 * Crea las rutas de webhooks
 * @param webhookController - Controlador de webhooks (inyectado desde server.ts)
 * @returns Router configurado con todas las rutas de webhooks
 */
export const createWebhookRoutes = (webhookController: WebhookController) => {
    const router = Router();

    logger.debug({}, 'Configurando rutas de webhooks');

    /**
     * POST /api/webhooks/kick
     * Recibe eventos de chat de Kick
     * Middleware: validateKickWebhook (valida firma RSA-SHA256)
     * 
     * Validación específica de Kick:
     * - Headers: Kick-Event-Signature, Kick-Event-Message-Timestamp, Kick-Event-Message-Id
     * - Método: RSA-SHA256
     * - Payload: KickChatMessagePayload
     */
    router.post('/kick', validateKickWebhook, webhookController.handleKickWebhook);

    /**
     * POST /api/webhooks/youtube
     * Recibe eventos de YouTube (placeholder)
     * Middleware: validateYouTubeWebhook (validación específica de YouTube)
     * 
     * TODO: Implementar validación de YouTube
     * - Headers: Específicos de YouTube
     * - Método: Específico de YouTube
     * - Payload: YouTubeWebhookPayload
     */
    router.post('/youtube', validateYouTubeWebhook, webhookController.handleYouTubeWebhook);

    /**
     * POST /api/webhooks/twitch
     * Recibe eventos de Twitch (placeholder)
     * Middleware: validateTwitchWebhook (validación específica de Twitch)
     * 
     * TODO: Implementar validación de Twitch
     * - Headers: Específicos de Twitch
     * - Método: HMAC-SHA256 (diferente a Kick)
     * - Payload: TwitchWebhookPayload
     */
    router.post('/twitch', validateTwitchWebhook, webhookController.handleTwitchWebhook);

    return router;
};

export default createWebhookRoutes;