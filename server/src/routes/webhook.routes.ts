/** Rutas de webhooks para recibir eventos de plataformas externas con validación de firma específica */

import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { validateKickWebhook } from '../middleware/webhook.middleware';
import { logger } from '../utils/logger';

export const createWebhookRoutes = (webhookController: WebhookController) => {
    const router = Router();

    logger.debug({}, 'Configurando rutas de webhooks');

    router.post('/kick', validateKickWebhook, webhookController.handleKickWebhook);

    return router;
};

export default createWebhookRoutes;