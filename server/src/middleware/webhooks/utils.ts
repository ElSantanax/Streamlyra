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
 * Estándar de industria recomendado por Twitch y otras plataformas.
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

    const drift = now.getTime() - timestampDate.getTime();
    const absDrift = Math.abs(drift);

    if (absDrift > MAX_TIMESTAMP_AGE_MS) {
        logger.error({
            timestamp,
            serverTime: now.toISOString(),
            driftSeconds: Math.round(drift / 1000),
            toleranceSeconds: MAX_TIMESTAMP_AGE_MS / 1000
        }, 'Webhook rechazado: Desincronización de reloj excesiva (Clock Skew)');

        throw new AppError(`Webhook timestamp out of range. Drift: ${Math.round(drift / 1000)}s`, 400);
    }

    if (absDrift > 60000) {
        logger.warn({ driftSeconds: Math.round(drift / 1000) }, 'Aviso: Desfase de reloj detectado en webhook');
    }
};