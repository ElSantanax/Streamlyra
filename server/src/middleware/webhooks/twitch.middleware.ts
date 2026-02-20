import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { TwitchWebhookService } from '../../services/chat/twitch/TwitchWebhookService';
import { TwitchWebhook } from '../../models/TwitchWebhook.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { WebhookCache } from '../../services/webhook/WebhookCache';
import { RequestWithWebhookData, validateTimestamp } from './utils';
import { encryptionService } from '../../services/security/EncryptionService';

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
 * Middleware de validación Twitch EventSub. 
 * Optimizado para respuesta rápida (<3s) y validación de firma HMAC-SHA256.
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
            logger.warn({ messageId, timestamp, signature, messageType }, 'Missing Twitch headers');
            throw new AppError('Missing required Twitch headers', 400);
        }

        validateTimestamp(timestamp);

        const body = req.body as TwitchPayload;
        const broadcasterId =
            body.subscription?.condition?.broadcaster_user_id ||
            body.subscription?.condition?.to_broadcaster_user_id ||
            body.subscription?.condition?.user_id ||
            body.event?.broadcaster_user_id ||
            body.event?.to_broadcaster_user_id;

        const subscriptionId = req.header('Twitch-Eventsub-Subscription-Id') || body.subscription?.id;
        const type = req.header('Twitch-Eventsub-Subscription-Type') || body.subscription?.type;

        if (!broadcasterId) {
            throw new AppError('Missing broadcaster ID in payload', 400);
        }

        // Búsqueda en Caché Multinivel
        let dbWebhookData: TwitchWebhook | null = null;
        const cache = WebhookCache.getInstance();

        if (subscriptionId) {
            dbWebhookData = cache.get<TwitchWebhook>(WebhookCache.keys.twitchSub(subscriptionId));
        }

        if (!dbWebhookData) {
            const legacyKey = WebhookCache.keys.webhook('twitch', broadcasterId, type) + ':full';
            dbWebhookData = cache.get<TwitchWebhook>(legacyKey);
        }

        // Fallback a DB y actualización de caché
        if (!dbWebhookData) {
            const orFilters: Record<string, unknown>[] = [];
            if (subscriptionId) orFilters.push({ subscriptionId });

            const fallback: Record<string, unknown> = {
                broadcasterId,
                status: { [Op.in]: ['enabled', 'verification_pending', 'revoked'] }
            };
            if (type) fallback.type = type;
            orFilters.push(fallback);

            dbWebhookData = await TwitchWebhook.findOne({
                where: { [Op.or]: orFilters },
                order: [['createdAt', 'DESC']]
            });

            if (dbWebhookData) {
                if (dbWebhookData.subscriptionId) {
                    cache.set(WebhookCache.keys.twitchSub(dbWebhookData.subscriptionId), dbWebhookData);
                }
                const legacyKey = WebhookCache.keys.webhook('twitch', broadcasterId, dbWebhookData.type);
                cache.set(legacyKey + ':full', dbWebhookData);
                cache.set(legacyKey, dbWebhookData.status === 'enabled');
            }
        }

        if (!dbWebhookData) {
            throw new AppError('Webhook not registered', 404);
        }

        // Manejo de secretos y auto-migración a encriptado
        let plainSecret = dbWebhookData.secret;
        const context = `TwitchWebhook:${dbWebhookData.id} (${dbWebhookData.broadcasterId})`;

        if (!encryptionService.isEncrypted(plainSecret)) {
            const encryptedSecret = encryptionService.encrypt(plainSecret);
            dbWebhookData.update({ secret: encryptedSecret }).catch(err => {
                logger.error({ err, context }, 'Error in background secret migration');
            });
            logger.info({ context }, 'Auto-migrating legacy secret');
        } else {
            plainSecret = encryptionService.decrypt(plainSecret, context);
        }

        const rawBody = req.rawBody || JSON.stringify(req.body);
        const isValidSignature = TwitchWebhookService.verifySignature(
            plainSecret, messageId, timestamp, rawBody, signature
        );

        if (!isValidSignature) throw new AppError('Invalid Twitch signature', 401);

        if (TwitchWebhookService.isDuplicate(messageId)) {
            return res.status(200).send('OK (Duplicate)');
        }

        if (messageType === 'revocation') {
            await TwitchWebhookService.handleRevocation(
                broadcasterId, body.subscription?.status || 'revoked', body.subscription?.id
            );
            return res.status(200).send('OK (Revoked)');
        }

        if (messageType === 'webhook_callback_verification') {
            await TwitchWebhookService.handleVerification(
                broadcasterId, body.subscription?.id || '', body.subscription?.type
            );
            return res.status(200).send(body.challenge);
        }

        req.webhookData = {
            signature,
            timestamp,
            messageId,
            eventType: body.subscription?.type || 'unknown',
            body: body as unknown as Record<string, unknown>
        };

        next();
    } catch (error) {
        if (error instanceof AppError) return next(error);
        logger.error({ err: error }, 'Twitch validation fatal error');
        return next(new AppError('Twitch validation failed', 500));
    }
};