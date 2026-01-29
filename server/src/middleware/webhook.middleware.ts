/**
 * Middlewares de Validación de Webhooks - Valida y extrae datos de webhooks
 */

import { Request, Response, NextFunction } from 'express';
import { KickWebhookService } from '../services/chat/KickWebhookService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { config } from '../config';

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

interface WebhookData {
    signature: string;
    timestamp: string;
    messageId: string;
    eventType: string;
    body: Record<string, unknown>;
}

interface RequestWithWebhookData extends RequestWithRawBody {
    webhookData?: WebhookData;
}

export const validateKickWebhook = async (
    req: RequestWithWebhookData,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        logger.info({
            method: req.method,
            url: req.url,
            headers: Object.keys(req.headers),
            bodySize: req.rawBody?.length || 0
        }, 'KICK WEBHOOK RECIBIDO');

        const signature =
            req.header('Kick-Event-Signature') ||
            req.header('X-Kick-Signature') ||
            '';
        const timestamp =
            req.header('Kick-Event-Message-Timestamp') ||
            req.header('X-Kick-Timestamp') ||
            '';
        const messageId =
            req.header('Kick-Event-Message-Id') ||
            req.header('X-Kick-Event-Message-Id') ||
            '';
        const eventType =
            req.header('Kick-Event-Type') ||
            req.header('X-Kick-Event-Type') ||
            '';

        logger.info({
            eventType,
            messageIdPrefix: messageId?.substring(0, 20),
            timestamp,
            signaturePresent: !!signature,
            bodySize: req.rawBody?.length,
            bodyPreview: JSON.stringify(req.body).substring(0, 200)
        }, 'Kick webhook validation started');

        if (!signature || !timestamp || !messageId) {
            logger.error({
                hasSignature: !!signature,
                hasTimestamp: !!timestamp,
                hasMessageId: !!messageId
            }, 'Missing required Kick webhook headers');
            throw new AppError('Missing signature, timestamp, or message id', 400);
        }

        const rawBody = req.rawBody || JSON.stringify(req.body);

        const skipSignature = config.skipKickSignatureVerification || false;
        logger.debug({ skipSignature }, 'Kick webhook signature verification');

        const isValid = skipSignature ? true : await KickWebhookService.verifySignature(
            signature,
            messageId,
            timestamp,
            rawBody
        );

        if (!isValid) {
            logger.warn({}, 'Invalid Kick webhook signature');
            throw new AppError('Invalid signature', 401);
        }

        logger.info({}, '✅ Kick webhook validation passed');

        req.webhookData = {
            signature,
            timestamp,
            messageId,
            eventType,
            body: req.body as Record<string, unknown>
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        logger.error({ err: error }, 'Error validating Kick webhook');
        throw new AppError('Webhook validation failed', 500);
    }
};
