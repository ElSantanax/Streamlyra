import { Response, NextFunction } from 'express';
import { KickWebhookService } from '../../services/chat/kick/KickWebhookService';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import {
    RequestWithWebhookData,
    extractHeader,
    validateTimestamp
} from './utils';

/**
 * Mapeo de headers estándar y alternativos de Kick
 */
const KICK_HEADERS = {
    SIGNATURE: ['Kick-Event-Signature', 'X-Kick-Signature', 'kick-event-signature'],
    TIMESTAMP: ['Kick-Event-Message-Timestamp', 'X-Kick-Timestamp', 'kick-event-message-timestamp'],
    MESSAGE_ID: ['Kick-Event-Message-Id', 'X-Kick-Event-Message-Id', 'kick-event-message-id'],
    EVENT_TYPE: ['Kick-Event-Type', 'X-Kick-Event-Type', 'kick-event-type']
} as const;

const validateRequiredHeaders = (signature: string, timestamp: string, messageId: string): void => {
    if (!signature || !timestamp || !messageId) {
        logger.error({
            hasSignature: !!signature,
            hasTimestamp: !!timestamp,
            hasMessageId: !!messageId
        }, 'Missing required Kick webhook headers');
        throw new AppError('Missing signature, timestamp, or message id', 400);
    }
};

interface KickPayload {
    event?: string;
    eventType?: string;
    challenge?: string;
}

/**
 * Middleware para la validación de integridad y autenticidad de webhooks de Kick
 */
export const validateKickWebhook = async (
    req: RequestWithWebhookData,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const signature = extractHeader(req, KICK_HEADERS.SIGNATURE);
        const timestamp = extractHeader(req, KICK_HEADERS.TIMESTAMP);
        const messageId = extractHeader(req, KICK_HEADERS.MESSAGE_ID);
        const eventType = extractHeader(req, KICK_HEADERS.EVENT_TYPE);

        // MANEJO DE CHALLENGE: Kick requiere devolver el challenge para verificar el webhook
        const body = req.body as KickPayload;
        const bodyType = eventType || body?.event || body?.eventType;
        if (bodyType === 'webhook.callback_verification' || bodyType === 'webhook_callback_verification' || body?.challenge) {
            const challenge = body?.challenge;
            logger.info({ challenge }, 'KICK CHALLENGE RECEIVED: Verificando webhook');
            return res.status(200).send(challenge);
        }

        validateRequiredHeaders(signature, timestamp, messageId);
        validateTimestamp(timestamp);

        const rawBody = req.rawBody;
        if (typeof rawBody !== 'string') {
            logger.error('Missing rawBody for Kick webhook signature validation');
            throw new AppError('Raw payload required for validation', 400);
        }
        const skipSignature = config.skipKickSignatureVerification || false;

        const isValid = skipSignature || await KickWebhookService.verifySignature(
            signature,
            messageId,
            timestamp,
            rawBody
        );

        if (!isValid) {
            logger.error({
                messageId,
                signaturePresent: !!signature,
                bodyLength: rawBody.length,
                skipSignature
            }, 'Firma de webhook de Kick INVÁLIDA');
            throw new AppError('Invalid signature', 401);
        }

        if (KickWebhookService.isDuplicate(messageId)) {
            return res.status(200).send('OK (Duplicate)');
        }

        req.webhookData = {
            signature,
            timestamp,
            messageId,
            eventType,
            body: req.body as Record<string, unknown>
        };

        next();
    } catch (error) {
        if (error instanceof AppError) return next(error);

        logger.error({
            err: error,
            path: req.path,
            headers: req.headers
        }, 'Error crítico validando webhook de Kick');
        return next(new AppError('Webhook validation failed', 500));
    }
};