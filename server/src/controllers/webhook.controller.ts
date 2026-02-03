import { Request, Response } from 'express';
import { WebhookProcessor } from '../services/webhook/WebhookProcessor';
import { AppError } from '../utils/AppError';
import { KickWebhookPayload } from '../types/kick.types';
import { logger } from '../utils/logger';

interface WebhookData {
    signature: string;
    timestamp: string;
    messageId: string;
    eventType: string;
    body: Record<string, unknown>;
}

interface RequestWithWebhookData extends Request {
    webhookData?: WebhookData;
}

/**
 * Controlador de Webhooks - Maneja peticiones HTTP para webhooks
 */
export class WebhookController {
    constructor(private webhookProcessor: WebhookProcessor) { }

    private async handleWebhook(
        platform: string,
        req: RequestWithWebhookData,
        res: Response
    ): Promise<void> {
        const webhookData = req.webhookData;

        if (!webhookData) {
            throw new AppError('Webhook data not found', 400);
        }

        if (platform !== 'kick') {
            throw new AppError(`Platform ${platform} is not supported for webhooks`, 400);
        }

        if (platform === 'kick') {
            await this.webhookProcessor.processKickEvent(
                webhookData.body as unknown as KickWebhookPayload,
                webhookData.eventType
            );
        }
        res.status(200).send('OK');
    }

    handleKickWebhook = async (req: RequestWithWebhookData, res: Response): Promise<void> => {
        logger.info({
            webhookData: req.webhookData,
            bodyKeys: Object.keys(req.body || {})
        }, 'KICK WEBHOOK CONTROLLER: Procesando evento');

        await this.handleWebhook('kick', req, res);

        logger.info({}, 'KICK WEBHOOK CONTROLLER: Evento procesado exitosamente');
    };
}
