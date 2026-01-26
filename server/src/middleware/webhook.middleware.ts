/**
 * Middlewares de Validación de Webhooks
 * Responsabilidad: Validar y extraer datos de webhooks
 * 
 * IMPORTANTE: Cada plataforma tiene su propio middleware porque
 * tienen diferentes headers, métodos de verificación y estructuras.
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

/**
 * Middleware de validación para webhooks de Kick
 * Extrae headers, valida presencia y verifica firma
 */
export const validateKickWebhook = async (
    req: RequestWithWebhookData,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extraer headers (con fallbacks para variaciones)
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
            bodySize: req.rawBody?.length
        }, 'Kick webhook validation started');

        // Validar presencia de headers requeridos
        if (!signature || !timestamp || !messageId) {
            logger.error({}, 'Missing required Kick webhook headers');
            throw new AppError('Missing signature, timestamp, or message id', 400);
        }

        // Obtener body raw para verificación de firma
        const rawBody = req.rawBody || JSON.stringify(req.body);

        // Verificar firma (con opción de skip para desarrollo)
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

        logger.info({}, 'Kick webhook validation passed');

        // Pasar datos validados al controlador
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

/**
 * Middleware de validación para webhooks de YouTube (placeholder)
 */
export const validateYouTubeWebhook = async (
    req: RequestWithWebhookData,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        logger.info({}, 'YouTube webhook validation started (not yet implemented)');

        // TODO: Implementar validación de webhooks de YouTube
        // - Extraer headers específicos de YouTube
        // - Validar presencia de headers
        // - Verificar firma (método específico de YouTube)

        req.webhookData = {
            signature: '',
            timestamp: '',
            messageId: '',
            eventType: '',
            body: req.body as Record<string, unknown>
        };

        next();
    } catch (error) {
        logger.error({ err: error }, 'Error validating YouTube webhook');
        throw new AppError('Webhook validation failed', 500);
    }
};

/**
 * Middleware de validación para webhooks de Twitch (placeholder)
 */
export const validateTwitchWebhook = async (
    req: RequestWithWebhookData,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        logger.info({}, 'Twitch webhook validation started (not yet implemented)');

        // TODO: Implementar validación de webhooks de Twitch
        // - Extraer headers específicos de Twitch
        // - Validar presencia de headers
        // - Verificar firma (HMAC-SHA256, diferente a Kick)

        req.webhookData = {
            signature: '',
            timestamp: '',
            messageId: '',
            eventType: '',
            body: req.body as Record<string, unknown>
        };

        next();
    } catch (error) {
        logger.error({ err: error }, 'Error validating Twitch webhook');
        throw new AppError('Webhook validation failed', 500);
    }
};
