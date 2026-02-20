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
 * Margen de tolerancia para timestamps (5 min) para mitigar Replay Attacks.
 */
export const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export const extractHeader = (req: Request, headerNames: readonly string[]): string => {
    for (const name of headerNames) {
        const value = req.header(name);
        if (value) return value;
    }
    return '';
};

/**
 * Valida la antigüedad del mensaje y detecta discrepancias de reloj (Clock Skew).
 */
export const validateTimestamp = (timestamp: string): void => {
    const timestampDate = new Date(timestamp);
    const now = new Date();

    if (isNaN(timestampDate.getTime())) {
        throw new AppError('Invalid timestamp format', 400);
    }

    const age = now.getTime() - timestampDate.getTime();

    if (age > MAX_TIMESTAMP_AGE_MS) {
        logger.warn({ timestamp, age }, 'Webhook timestamp too old');
        throw new AppError('Webhook timestamp too old', 400);
    }

    if (age < -MAX_TIMESTAMP_AGE_MS) {
        logger.warn({ timestamp, age }, 'Webhook timestamp from future');
        throw new AppError('Webhook timestamp from future', 400);
    }
};