import axios from 'axios';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { YouTubeSubscription } from '../../../models/YouTubeSubscription.model';
import { config } from '../../../config';
import { encryptionService } from '../../security/EncryptionService';

class YouTubePubSubService {
    private readonly HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
    private readonly TOPIC_BASE = 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=';
    private readonly LEASE_SECONDS = 432000;
    private readonly TIMEOUT = 10000;

    private generateSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    verifySignature(secret: string, body: string, signature: string): boolean {
        const hmac = crypto.createHmac('sha1', secret);
        hmac.update(body);
        const expectedSignature = 'sha1=' + hmac.digest('hex');

        const expectedBuffer = Buffer.from(expectedSignature);
        const signatureBuffer = Buffer.from(signature);

        if (expectedBuffer.length !== signatureBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    }

    async subscribe(
        userId: string,
        channelId: string
    ): Promise<void> {
        const topicUrl = this.TOPIC_BASE + channelId;
        const callbackUrl = `${config.appUrl}/api/webhooks/youtube`;
        const secret = this.generateSecret();

        try {
            logger.info({ userId, channelId }, 'Suscribiendo a notificaciones de YouTube (PubSubHubbub)');

            const subscription = await YouTubeSubscription.findOne({
                where: {
                    userId,
                    channelId
                }
            });

            if (subscription && (subscription.status === 'verified' || subscription.status === 'pending')) {
                logger.debug({ userId, channelId, status: subscription.status }, 'Ya existe una suscripción activa/pendiente para este canal');
                return;
            }

            const response = await axios.post(
                this.HUB_URL,
                new URLSearchParams({
                    'hub.mode': 'subscribe',
                    'hub.topic': topicUrl,
                    'hub.callback': callbackUrl,
                    'hub.secret': secret,
                    'hub.lease_seconds': this.LEASE_SECONDS.toString()
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: this.TIMEOUT
                }
            );

            if (response.status === 202 || response.status === 204) {
                const encryptedSecret = encryptionService.encrypt(secret);
                if (subscription) {
                    await subscription.update({
                        topicUrl,
                        callbackUrl,
                        secret: encryptedSecret,
                        status: 'pending',
                        expirationDate: new Date(Date.now() + this.LEASE_SECONDS * 1000),
                        registeredAt: new Date()
                    });
                    logger.debug({ userId, channelId }, 'Registro de suscripción previo actualizado a pending');
                } else {
                    await YouTubeSubscription.create({
                        userId,
                        channelId,
                        topicUrl,
                        callbackUrl,
                        secret: encryptedSecret,
                        status: 'pending',
                        expirationDate: new Date(Date.now() + this.LEASE_SECONDS * 1000),
                        registeredAt: new Date()
                    });
                    logger.debug({ userId, channelId }, 'Nuevo registro de suscripción creado');
                }

                logger.info({ userId, channelId, status: response.status }, 'Suscripción a YouTube PubSubHubbub solicitada exitosamente');
            } else {
                throw new Error(`Hub respondió con status inesperado: ${response.status}`);
            }
        } catch (error) {
            logger.error({ err: error, userId, channelId }, 'Error al suscribirse a YouTube PubSubHubbub');
            throw error;
        }
    }

    async unsubscribe(
        userId: string,
        channelId: string
    ): Promise<void> {
        try {
            const subscription = await YouTubeSubscription.findOne({
                where: { userId, channelId, status: ['pending', 'verified'] }
            });

            if (!subscription) {
                logger.warn({ userId, channelId }, 'No se encontró suscripción activa para cancelar');
                return;
            }

            logger.info({ userId, channelId }, 'Cancelando suscripción de YouTube PubSubHubbub');

            await axios.post(
                this.HUB_URL,
                new URLSearchParams({
                    'hub.mode': 'unsubscribe',
                    'hub.topic': subscription.topicUrl,
                    'hub.callback': subscription.callbackUrl
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: this.TIMEOUT
                }
            );

            await subscription.update({
                status: 'expired',
                expirationDate: new Date()
            });

            logger.info({ userId, channelId }, 'Suscripción de YouTube cancelada exitosamente');
        } catch (error) {
            logger.error({ err: error, userId, channelId }, 'Error al cancelar suscripción de YouTube');
            throw error;
        }
    }

    async handleVerification(
        channelId: string,
        mode: string,
        challenge: string
    ): Promise<string> {
        logger.info({ channelId, mode }, 'Recibida verificación de YouTube PubSubHubbub');

        if (mode === 'subscribe') {
            await YouTubeSubscription.update(
                { status: 'verified' },
                {
                    where: {
                        channelId,
                        status: 'pending'
                    }
                }
            );

            logger.debug({ channelId }, 'Suscripción de YouTube verificada exitosamente');
        } else if (mode === 'unsubscribe') {
            await YouTubeSubscription.update(
                { status: 'expired' },
                {
                    where: { channelId }
                }
            );

            logger.debug({ channelId }, 'Desuscripción de YouTube confirmada');
        }

        return challenge;
    }

    async updateLastNotification(channelId: string): Promise<void> {
        await YouTubeSubscription.update(
            { lastNotificationAt: new Date() },
            { where: { channelId, status: 'verified' } }
        );
    }

    async getExpiringSubscriptions(daysBeforeExpiry: number = 2): Promise<YouTubeSubscription[]> {
        const expirationThreshold = new Date();
        expirationThreshold.setDate(expirationThreshold.getDate() + daysBeforeExpiry);

        return await YouTubeSubscription.findAll({
            where: {
                status: 'verified',
                expirationDate: {
                    [Op.lte]: expirationThreshold
                }
            }
        });
    }

    async renewSubscription(subscription: YouTubeSubscription): Promise<void> {
        try {
            logger.info({
                channelId: subscription.channelId,
                expiresAt: subscription.expirationDate
            }, 'Renovando suscripción de YouTube PubSubHubbub');

            let plainSecret = subscription.secret;
            const context = `YouTubeSubscription:${subscription.id}:Renewal`;

            if (encryptionService.isEncrypted(plainSecret)) {
                plainSecret = encryptionService.decrypt(plainSecret, context);
            }

            const response = await axios.post(
                this.HUB_URL,
                new URLSearchParams({
                    'hub.mode': 'subscribe',
                    'hub.topic': subscription.topicUrl,
                    'hub.callback': subscription.callbackUrl,
                    'hub.secret': plainSecret,
                    'hub.lease_seconds': this.LEASE_SECONDS.toString()
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: this.TIMEOUT
                }
            );

            if (response.status === 202 || response.status === 204) {
                const encryptedSecret = encryptionService.encrypt(plainSecret);
                await subscription.update({
                    expirationDate: new Date(Date.now() + this.LEASE_SECONDS * 1000),
                    status: 'pending',
                    secret: encryptedSecret
                });

                logger.info({ channelId: subscription.channelId }, 'Renovación de suscripción solicitada exitosamente');
            }
        } catch (error) {
            logger.error({ err: error, channelId: subscription.channelId }, 'Error al renovar suscripción');
            throw error;
        }
    }
}

export const youtubePubSubService = new YouTubePubSubService();
export { YouTubePubSubService };