/**
 * Middleware de Validación de Webhooks de Twitch (EventSub)
 */

import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { TwitchWebhookService } from '../../services/chat/twitch/TwitchWebhookService';
import { TwitchWebhook } from '../../models/TwitchWebhook.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { WebhookCache } from '../../services/webhook/WebhookCache';
import {
    RequestWithWebhookData,
    validateTimestamp
} from './utils';
import { encryptionService } from '../../services/security/EncryptionService';


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

        // 3. Buscar el secreto (Estrategia de Caché Multinivel)
        let dbWebhookData: TwitchWebhook | null = null;
        const cache = WebhookCache.getInstance();

        // 3a. Intentar por subscriptionId (Más preciso)
        if (subscriptionId) {
            const subCacheKey = WebhookCache.keys.twitchSub(subscriptionId);
            dbWebhookData = cache.get<TwitchWebhook>(subCacheKey);
        }

        // 3b. Intentar por broadcaster + type (Fallback Caché)
        if (!dbWebhookData) {
            const legacyCacheKey = WebhookCache.keys.webhook('twitch', broadcasterId, type) + ':full';
            dbWebhookData = cache.get<TwitchWebhook>(legacyCacheKey);
        }

        // 3c. Búsqueda UNIFICADA en Base de Datos (Estrategia: Prioridad absoluta al más reciente)
        if (!dbWebhookData) {
            const orFilters: Record<string, unknown>[] = [];

            if (subscriptionId) {
                orFilters.push({ subscriptionId });
            }

            // Fallback: Broadcaster + (Tipo opcional si viene en el payload)
            const fallback: Record<string, unknown> = {
                broadcasterId,
                status: { [Op.in]: ['enabled', 'verification_pending', 'revoked'] }
            };
            if (type) {
                fallback.type = type;
            }

            orFilters.push(fallback);

            dbWebhookData = await TwitchWebhook.findOne({
                where: { [Op.or]: orFilters },
                order: [['createdAt', 'DESC']]
            });

            if (dbWebhookData) {
                // Poblado multinivel de caché para detener futuras queries
                if (dbWebhookData.subscriptionId) {
                    cache.set(WebhookCache.keys.twitchSub(dbWebhookData.subscriptionId), dbWebhookData);
                }
                const legacyCacheKey = WebhookCache.keys.webhook('twitch', broadcasterId, dbWebhookData.type);
                cache.set(legacyCacheKey + ':full', dbWebhookData);
                cache.set(legacyCacheKey, dbWebhookData.status === 'enabled');
            }
        }

        if (!dbWebhookData) {
            logger.error({ broadcasterId, subscriptionId, type }, 'No se encontró registro de webhook para este canal de Twitch');
            throw new AppError('Webhook not registered', 404);
        }

        // 4. Desencriptar secreto y Auto-migración si es necesario
        let plainSecret = dbWebhookData.secret;
        const context = `TwitchWebhook:${dbWebhookData.id} (${dbWebhookData.broadcasterId})`;

        if (!encryptionService.isEncrypted(plainSecret)) {
            // Migrar a encriptado de forma persistente pero SIN bloquear el hot path
            const encryptedSecret = encryptionService.encrypt(plainSecret);
            dbWebhookData.update({ secret: encryptedSecret }).catch(err => {
                logger.error({ err, context }, 'Error en auto-migración silenciosa de Twitch');
            });
            logger.info({ context }, 'Auto-migrating legacy Twitch webhook secret (non-blocking)');
        } else {
            plainSecret = encryptionService.decrypt(plainSecret, context);
        }

        // 5. Verificar firma (HMAC-SHA256)
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const isValidSignature = TwitchWebhookService.verifySignature(
            plainSecret,
            messageId,
            timestamp,
            rawBody,
            signature
        );

        if (!isValidSignature) {
            throw new AppError('Invalid Twitch signature', 401);
        }

        // 6. Prevención de Duplicados
        if (TwitchWebhookService.isDuplicate(messageId)) {
            return res.status(200).send('OK (Duplicate)');
        }

        // 7. Manejo de Revocaciones
        if (messageType === 'revocation') {
            await TwitchWebhookService.handleRevocation(
                broadcasterId,
                body.subscription?.status || 'revoked',
                body.subscription?.id
            );
            return res.status(200).send('OK (Revoked)');
        }

        // 8. Respuesta inmediata al Challenge
        if (messageType === 'webhook_callback_verification') {
            await TwitchWebhookService.handleVerification(
                broadcasterId,
                body.subscription?.id || '',
                body.subscription?.type
            );
            return res.status(200).send(body.challenge);
        }

        // 9. Preparar datos para el procesador final (TwitchWebhookProcessor)
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
