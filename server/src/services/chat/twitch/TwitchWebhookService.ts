import * as crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import { WebhookCache } from '../../webhook/WebhookCache';

export class TwitchWebhookService {
    private static processedMessages = new Set<string>();
    private static readonly MAX_CACHE_SIZE = 1000;

    /**
     * Verifica la firma enviada por Twitch en el header Twitch-Eventsub-Message-Signature
     */
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

    /**
     * Verifica si el mensaje ya ha sido procesado para evitar duplicados
     */
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

    /**
     * Maneja la verificación del callback (Challenge) de forma precisa
     */
    static async handleVerification(broadcasterId: string, subscriptionId: string, type?: string): Promise<void> {
        if (!subscriptionId) {
            logger.error({ broadcasterId, type }, 'No se pudo verificar: Falta subscriptionId');
            return;
        }

        // Primero intentamos por subscriptionId que es lo más preciso
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

        // Si no se actualizó nada (tal vez el ID aún no estaba en DB), intentamos por broadcasterId y tipo
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

        // Invalidar caché para que el procesador vea el nuevo estado 'enabled'
        if (type) {
            WebhookCache.getInstance().invalidate(WebhookCache.keys.webhook('twitch', broadcasterId, type));
        } else {
            // Si no hay tipo, invalidamos todas las suscripciones de ese broadcaster por si acaso
            WebhookCache.getInstance().invalidate(new RegExp(`^wh:twitch:${broadcasterId}:`));
        }

        logger.info({ broadcasterId, subscriptionId, type }, 'Twitch Webhooks: Suscripción habilitada correctamente');
    }

    /**
     * Maneja la revocación de una suscripción específica
     */
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

        // Invalidar caché
        WebhookCache.getInstance().invalidate(new RegExp(`^wh:twitch:${broadcasterId}:`));

        logger.warn({ broadcasterId, subscriptionId, status }, 'Twitch Webhooks: Suscripción marcada como REVOCADA');
    }

    /**
     * Genera un secreto aleatorio para una nueva suscripción
     */
    static generateSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
