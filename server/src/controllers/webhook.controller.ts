import { Request, Response } from 'express';
import { WebhookProcessor } from '../services/webhook/WebhookProcessor';
import { AppError } from '../utils/AppError';
import { KickChatMessagePayload } from '../types/kick.types';

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
 * Controlador de Webhooks
 * Responsabilidad: Manejar peticiones/respuestas HTTP
 * Lógica de negocio delegada a WebhookProcessor
 */
export class WebhookController {
    constructor(private webhookProcessor: WebhookProcessor) { }

    /**
     * Maneja webhook genérico para cualquier plataforma
     * 
     * Flujo:
     * 1. Validar que webhookData existe
     * 2. Procesar evento según plataforma
     * 3. Retornar OK
     */
    private async handleWebhook(
        platform: string,
        req: RequestWithWebhookData,
        res: Response
    ): Promise<void> {
        const webhookData = req.webhookData;

        if (!webhookData) {
            throw new AppError('Webhook data not found', 400);
        }

        // Procesar según plataforma
        switch (platform) {
            case 'kick':
                await this.webhookProcessor.processKickEvent(webhookData.body as unknown as KickChatMessagePayload);
                break;
            case 'youtube':
                await this.webhookProcessor.processYouTubeEvent(webhookData.body);
                break;
            case 'twitch':
                await this.webhookProcessor.processTwitchEvent(webhookData.body);
                break;
            default:
                throw new AppError(`Unknown platform: ${platform}`, 400);
        }

        res.status(200).send('OK');
    }

    /**
     * Maneja webhook de Kick
     */
    handleKickWebhook = async (req: RequestWithWebhookData, res: Response): Promise<void> => {
        await this.handleWebhook('kick', req, res);
    };

    /**
     * Maneja webhook de YouTube
     */
    handleYouTubeWebhook = async (req: RequestWithWebhookData, res: Response): Promise<void> => {
        await this.handleWebhook('youtube', req, res);
    };

    /**
     * Maneja webhook de Twitch
     */
    handleTwitchWebhook = async (req: RequestWithWebhookData, res: Response): Promise<void> => {
        await this.handleWebhook('twitch', req, res);
    };
}
