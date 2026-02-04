/**
 * Middlewares de Validación de Webhooks - Valida y extrae datos de webhooks
 */

import { Request, Response, NextFunction } from 'express';
import { KickWebhookService } from '../services/chat/kick/KickWebhookService';
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
 * Extrae un header probando múltiples nombres posibles
 */
const extractHeader = (req: Request, headerNames: readonly string[]): string => {
    for (const name of headerNames) {
        const value = req.header(name);
        if (value) return value;
    }
    return '';
};

/**
 * Valida que todos los headers requeridos estén presentes
 */
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutos

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
 * Valida la antigüedad del timestamp para prevenir replay attacks
 */
const validateTimestamp = (timestamp: string): void => {
    const timestampDate = new Date(timestamp);
    const now = new Date();

    // Verificar si es una fecha válida
    if (isNaN(timestampDate.getTime())) {
        throw new AppError('Invalid timestamp format', 400);
    }

    const age = now.getTime() - timestampDate.getTime();

    // Verificar si el timestamp está demasiado en el pasado
    if (age > MAX_TIMESTAMP_AGE_MS) {
        logger.warn({ timestamp, age }, 'Webhook timestamp too old');
        throw new AppError('Webhook timestamp too old', 400);
    }

    // Verificar si está demasiado en el futuro (clock skew)
    if (age < -MAX_TIMESTAMP_AGE_MS) {
        logger.warn({ timestamp, age }, 'Webhook timestamp from future');
        throw new AppError('Webhook timestamp from future', 400);
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
        logger.debug({
            method: req.method,
            url: req.url,
            headers: Object.keys(req.headers),
            bodySize: req.rawBody?.length || 0
        }, 'KICK WEBHOOK RECIBIDO');

        // Extraer headers
        const signature = extractHeader(req, KICK_HEADERS.SIGNATURE);
        const timestamp = extractHeader(req, KICK_HEADERS.TIMESTAMP);
        const messageId = extractHeader(req, KICK_HEADERS.MESSAGE_ID);
        const eventType = extractHeader(req, KICK_HEADERS.EVENT_TYPE);

        logger.debug({
            eventType,
            messageIdPrefix: messageId?.substring(0, 20),
            timestamp,
            signaturePresent: !!signature,
            bodySize: req.rawBody?.length,
            bodyPreview: JSON.stringify(req.body).substring(0, 200)
        }, 'Kick webhook validation started');

        // Validar headers requeridos
        validateRequiredHeaders(signature, timestamp, messageId);

        // Validar timestamp anti-replay
        validateTimestamp(timestamp);

        const rawBody = req.rawBody || JSON.stringify(req.body);
        const skipSignature = config.skipKickSignatureVerification || false;

        logger.debug({ skipSignature }, 'Kick webhook signature verification');

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

        logger.debug('Kick webhook validation passed');

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
