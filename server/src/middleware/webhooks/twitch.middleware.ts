/**
 * Middleware de Validación de Webhooks de Twitch (EventSub)
 */

import { Response, NextFunction } from 'express';
import { TwitchWebhookService } from '../../services/chat/twitch/TwitchWebhookService';
import { TwitchWebhook } from '../../models/TwitchWebhook.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import {
    RequestWithWebhookData,
    validateTimestamp
} from './utils';

/**
 * Interfaz para el payload de Twitch (Interna)
 */
interface TwitchPayload {
    subscription?: {
        id: string;
        type: string;
        status?: string;
        condition: {
            broadcaster_user_id?: string;
            to_broadcaster_user_id?: string;
            user_id?: string;
        };
    };
    event?: {
        broadcaster_user_id?: string;
        to_broadcaster_user_id?: string;
    };
    challenge?: string;
}

/**
 * Middleware que valida webhooks de Twitch (EventSub)
 * Cumple con el requisito de respuesta rápida (< 3s)
 */
export const validateTwitchWebhook = async (
    req: RequestWithWebhookData,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const messageId = req.header('Twitch-Eventsub-Message-Id');
        const timestamp = req.header('Twitch-Eventsub-Message-Timestamp');
        const signature = req.header('Twitch-Eventsub-Message-Signature');
        const messageType = req.header('Twitch-Eventsub-Message-Type');

        if (!messageId || !timestamp || !signature || !messageType) {
            logger.warn({ messageId, timestamp, signature, messageType }, 'Faltan headers obligatorios de Twitch EventSub');
            throw new AppError('Missing required Twitch headers', 400);
        }

        // 1. Validar antigüedad del mensaje (Anti-replay)
        validateTimestamp(timestamp);

        const body = req.body as TwitchPayload;

        // 2. Extraer broadcaster_id de forma inteligente
        const broadcasterId =
            body.subscription?.condition?.broadcaster_user_id ||
            body.subscription?.condition?.to_broadcaster_user_id ||
            body.subscription?.condition?.user_id ||
            body.event?.broadcaster_user_id ||
            body.event?.to_broadcaster_user_id;

        // 2a. Extraer ID de suscripción y tipo
        const subscriptionId = req.header('Twitch-Eventsub-Subscription-Id') || body.subscription?.id;
        const type = req.header('Twitch-Eventsub-Subscription-Type') || body.subscription?.type;

        if (!broadcasterId) {
            logger.warn({ body }, 'No se encontró broadcaster_user_id en el payload de Twitch');
            throw new AppError('Missing broadcaster ID in payload', 400);
        }

        // 3. Buscar el secreto (Prioridad: ID de suscripción > Tipo + Canal)
        let dbWebhookData = null;

        if (subscriptionId) {
            dbWebhookData = await TwitchWebhook.findOne({
                where: { subscriptionId }
            });
        }

        // Fallback: Si no se encuentra por ID, buscar por tipo y canal (útil durante resincronizaciones)
        if (!dbWebhookData && type) {
            dbWebhookData = await TwitchWebhook.findOne({
                where: {
                    broadcasterId,
                    type,
                    status: ['enabled', 'verification_pending', 'revoked']
                }
            });
        }

        // Fallback Legacy (solo broadcasterId - menos seguro, para compatibilidad)
        if (!dbWebhookData) {
            dbWebhookData = await TwitchWebhook.findOne({
                where: { broadcasterId, status: ['enabled', 'verification_pending', 'revoked'] },
                order: [['createdAt', 'DESC']] // Usar el más reciente si hay varios
            });
        }

        if (!dbWebhookData) {
            logger.error({ broadcasterId, subscriptionId, type }, 'No se encontró registro de webhook para este canal de Twitch');
            throw new AppError('Webhook not registered', 404);
        }

        // 4. Verificar firma (HMAC-SHA256)
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const isValidSignature = TwitchWebhookService.verifySignature(
            dbWebhookData.secret,
            messageId,
            timestamp,
            rawBody,
            signature
        );

        if (!isValidSignature) {
            throw new AppError('Invalid Twitch signature', 401);
        }

        // 5. Prevención de Duplicados
        if (TwitchWebhookService.isDuplicate(messageId)) {
            return res.status(200).send('OK (Duplicate)');
        }

        // 6. Manejo de Revocaciones
        if (messageType === 'revocation') {
            await TwitchWebhookService.handleRevocation(
                broadcasterId,
                body.subscription?.status || 'revoked',
                body.subscription?.id
            );
            return res.status(200).send('OK (Revoked)');
        }

        // 7. Respuesta inmediata al Challenge
        if (messageType === 'webhook_callback_verification') {
            await TwitchWebhookService.handleVerification(
                broadcasterId,
                body.subscription?.id || '',
                body.subscription?.type
            );
            return res.status(200).send(body.challenge);
        }

        // 8. Preparar datos para el procesador final (TwitchWebhookProcessor)
        req.webhookData = {
            signature,
            timestamp,
            messageId,
            eventType: body.subscription?.type || 'unknown',
            body: body as unknown as Record<string, unknown>
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }
        logger.error({ err: error }, 'Error fatal validando webhook de Twitch');
        return next(new AppError('Twitch validation failed', 500));
    }
};
