/** Rutas de webhooks para recibir eventos de plataformas externas con validación de firma específica */

import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { validateKickWebhook } from '../middleware/webhooks/kick.middleware';
import { validateTwitchWebhook } from '../middleware/webhooks/twitch.middleware';
import { validateYouTubeWebhook } from '../middleware/webhooks/youtube.middleware';
import { logger } from '../utils/logger';

export const createWebhookRoutes = (webhookController: WebhookController) => {
    const router = Router();

    logger.debug({}, 'Configurando rutas de webhooks');

    router.post('/kick', validateKickWebhook, webhookController.handleKickWebhook);
    router.post('/twitch', validateTwitchWebhook, webhookController.handleTwitchWebhook);
    router.all('/youtube', validateYouTubeWebhook, webhookController.handleYouTubeWebhook);

    return router;
};

export default createWebhookRoutes;