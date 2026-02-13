/**
 * Middleware de Validación de Webhooks de Kick
 */

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
 * Configuración de headers de Kick webhook
 */
const KICK_HEADERS = {
    SIGNATURE: ['Kick-Event-Signature', 'X-Kick-Signature'],
    TIMESTAMP: ['Kick-Event-Message-Timestamp', 'X-Kick-Timestamp'],
    MESSAGE_ID: ['Kick-Event-Message-Id', 'X-Kick-Event-Message-Id'],
    EVENT_TYPE: ['Kick-Event-Type', 'X-Kick-Event-Type']
} as const;

/**
 * Valida que todos los headers requeridos estén presentes
 */
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

/**
 * Middleware que valida webhooks de Kick
 */
export const validateKickWebhook = async (
    req: RequestWithWebhookData,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extraer headers
        const signature = extractHeader(req, KICK_HEADERS.SIGNATURE);
        const timestamp = extractHeader(req, KICK_HEADERS.TIMESTAMP);
        const messageId = extractHeader(req, KICK_HEADERS.MESSAGE_ID);
        const eventType = extractHeader(req, KICK_HEADERS.EVENT_TYPE);

        // Validar headers requeridos
        validateRequiredHeaders(signature, timestamp, messageId);

        // Validar timestamp anti-replay
        validateTimestamp(timestamp);

        const rawBody = req.rawBody || JSON.stringify(req.body);
        const skipSignature = config.skipKickSignatureVerification || false;

        // Verificar firma si no está deshabilitado
        const isValid = skipSignature || await KickWebhookService.verifySignature(
            signature,
            messageId,
            timestamp,
            rawBody
        );

        if (!isValid) {
            logger.warn('Invalid Kick webhook signature');
            throw new AppError('Invalid signature', 401);
        }

        // Adjuntar datos validados al request
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
            return next(error);
        }
        logger.error({ err: error }, 'Error validating Kick webhook');
        return next(new AppError('Webhook validation failed', 500));
    }
};
