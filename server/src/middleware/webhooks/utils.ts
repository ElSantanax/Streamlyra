/**
 * Utilidades base para middlewares de webhooks
 */

import { Request } from 'express';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export interface RequestWithRawBody extends Request {
    rawBody?: string;
}

export interface WebhookData {
    signature: string;
    timestamp: string;
    messageId: string;
    eventType: string;
    body: Record<string, unknown>;
}

export interface RequestWithWebhookData extends RequestWithRawBody {
    webhookData?: WebhookData;
}

/**
 * Tiempo máximo permitido para un timestamp (Anti-replay)
 */
export const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Extrae un header probando múltiples nombres posibles
 */
export const extractHeader = (req: Request, headerNames: readonly string[]): string => {
    for (const name of headerNames) {
        const value = req.header(name);
        if (value) return value;
    }
    return '';
};

/**
 * Valida la antigüedad del timestamp para prevenir replay attacks
 */
export const validateTimestamp = (timestamp: string): void => {
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
