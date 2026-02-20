import * as crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import { WebhookCache } from '../../webhook/WebhookCache';

export class TwitchWebhookService {
    private static processedMessages = new Set<string>();
    private static readonly MAX_CACHE_SIZE = 1000;

    static verifySignature(
        secret: string,
        messageId: string,
        timestamp: string,
        rawBody: string,
        signature: string
    ): boolean {
        try {
            if (!secret || !messageId || !timestamp || !rawBody || !signature) {
                logger.error({
                    hasSecret: !!secret,
                    hasId: !!messageId,
                    hasTimestamp: !!timestamp,
                    hasBody: !!rawBody,
                    hasSignature: !!signature
                }, 'Faltan componentes para verificar la firma de Twitch');
                return false;
            }

            const message = messageId + timestamp + rawBody;
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(message);
            const expectedSignature = 'sha256=' + hmac.digest('hex');

            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );

            if (!isValid) {
                logger.warn({ messageId }, 'Firma de Twitch EventSub INVÁLIDA');
            }

            return isValid;
        } catch (error) {
            logger.error({ err: error, messageId }, 'Error durante la verificación de firma de Twitch');
            return false;
        }
    }

    static isDuplicate(messageId: string): boolean {
        if (this.processedMessages.has(messageId)) {
            logger.debug({ messageId }, 'Twitch Webhooks: Mensaje duplicado ignorado');
            return true;
        }

        this.processedMessages.add(messageId);
        if (this.processedMessages.size > this.MAX_CACHE_SIZE) {
            const firstElement = this.processedMessages.values().next().value;
            if (firstElement !== undefined) {
                this.processedMessages.delete(firstElement);
            }
        }

        return false;
    }

    static async handleVerification(broadcasterId: string, subscriptionId: string, type?: string): Promise<void> {
        if (!subscriptionId) {
            logger.error({ broadcasterId, type }, 'No se pudo verificar: Falta subscriptionId');
            return;
        }

        const updated = await TwitchWebhook.update(
            {
                status: 'enabled',
                lastEventAt: new Date()
            },
            {
                where: {
                    subscriptionId,
                    broadcasterId
                }
            }
        );

        if (updated[0] === 0 && type) {
            await TwitchWebhook.update(
                {
                    status: 'enabled',
                    subscriptionId,
                    lastEventAt: new Date()
                },
                {
                    where: {
                        broadcasterId,
                        type
                    }
                }
            );
        }

        const cache = WebhookCache.getInstance();
        if (type) {
            cache.invalidate(WebhookCache.keys.webhook('twitch', broadcasterId, type));
            cache.invalidate(WebhookCache.keys.webhook('twitch', broadcasterId, type) + ':full');
        }
        if (subscriptionId) {
            cache.invalidate(WebhookCache.keys.twitchSub(subscriptionId));
        }
        if (!type && !subscriptionId) {
            cache.invalidate(new RegExp(`^wh:twitch:${broadcasterId}:`));
        }

        logger.info({ broadcasterId, subscriptionId, type }, 'Twitch Webhooks: Suscripción habilitada correctamente');
    }

    static async handleRevocation(broadcasterId: string, status: string, subscriptionId?: string): Promise<void> {
        const where = subscriptionId
            ? { broadcasterId, subscriptionId }
            : { broadcasterId };

        await TwitchWebhook.update(
            {
                status: 'revoked',
                lastEventAt: new Date()
            },
            { where }
        );

        const cache = WebhookCache.getInstance();
        cache.invalidate(new RegExp(`^wh:twitch:${broadcasterId}:`));
        if (subscriptionId) {
            cache.invalidate(WebhookCache.keys.twitchSub(subscriptionId));
        }

        logger.warn({ broadcasterId, subscriptionId, status }, 'Twitch Webhooks: Suscripción marcada como REVOCADA');
    }

    static generateSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}