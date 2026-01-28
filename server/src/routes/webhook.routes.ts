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
import { validateKickWebhook } from '../middleware/webhook.middleware';
import { logger } from '../utils/logger';

/**
 * Crea las rutas de webhooks
 * @param webhookController - Controlador de webhooks (inyectado desde server.ts)
 * @returns Router configurado para webhooks de Kick
 */
export const createWebhookRoutes = (webhookController: WebhookController) => {
    const router = Router();

    logger.debug({}, 'Configurando rutas de webhooks');

    /**
     * POST /api/webhooks/kick
     * Recibe eventos de chat de Kick
     * Middleware: validateKickWebhook (valida firma RSA-SHA256)
     */
    router.post('/kick', validateKickWebhook, webhookController.handleKickWebhook);

    return router;
};

export default createWebhookRoutes;