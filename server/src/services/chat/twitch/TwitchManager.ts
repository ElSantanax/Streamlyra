/** Gestor avanzado de suscripciones de Twitch EventSub */

import { TwitchEventSubClient } from '../../platforms/TwitchEventSubClient';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import { TwitchWebhookService } from './TwitchWebhookService';
import { logger } from '../../../utils/logger';
import { config } from '../../../config';
import { EncryptionService } from '../../security/EncryptionService';

export class TwitchManager {
    private encryptionService = new EncryptionService();
    private readonly EVENT_TYPES = [
        { type: 'channel.follow', version: '2' },
        { type: 'channel.subscribe', version: '1' },
        { type: 'channel.raid', version: '1' },
        { type: 'channel.chat.message', version: '1' },
        { type: 'stream.online', version: '1' },
        { type: 'stream.offline', version: '1' }
    ];

    async registerWebhooks(userId: string, broadcasterId: string): Promise<void> {
        try {
            if (!config.appUrl?.startsWith('https://')) {
                logger.warn({ broadcasterId }, 'Twitch Webhooks: APP_URL no es HTTPS, suscripción omitida');
                return;
            }

            const callbackUrl = `${config.appUrl}/api/webhooks/twitch`;

            for (const event of this.EVENT_TYPES) {
                await this.ensureSubscription(userId, broadcasterId, event.type, event.version, callbackUrl);
            }
        } catch (error) {
            logger.error({ err: error, userId, broadcasterId }, 'Twitch Webhooks: Error crítico durante el registro masivo');
        }
    }

    private async ensureSubscription(
        userId: string,
        broadcasterId: string,
        type: string,
        version: string,
        callbackUrl: string
    ): Promise<void> {
        let existingWebhook;
        let condition: Record<string, string> = {};

        try {
            existingWebhook = await TwitchWebhook.findOne({
                where: { broadcasterId, type }
            });

            if (existingWebhook?.status === 'enabled' && existingWebhook.callbackUrl === callbackUrl) {
                logger.debug({ broadcasterId, type }, 'Twitch Webhooks: Suscripción ya activa');
                return;
            }

            const secret = existingWebhook?.secret || TwitchWebhookService.generateSecret();

            condition = {};

            switch (type) {
                case 'channel.follow':
                    condition.broadcaster_user_id = broadcasterId;
                    if (version === '2') {
                        condition.moderator_user_id = broadcasterId;
                    }
                    break;
                case 'channel.chat.message':
                    condition.broadcaster_user_id = broadcasterId;
                    condition.user_id = broadcasterId;
                    break;
                case 'channel.raid':
                    condition.to_broadcaster_user_id = broadcasterId;
                    break;
                case 'channel.subscribe':
                case 'stream.online':
                case 'stream.offline':
                    condition.broadcaster_user_id = broadcasterId;
                    break;
                default:
                    condition.broadcaster_user_id = broadcasterId;
            }

            const subscription = await TwitchEventSubClient.subscribe(
                type,
                version,
                condition,
                callbackUrl,
                secret
            );

            const subscriptionId = subscription.data?.[0]?.id || null;
            const encryptedSecret = this.encryptionService.encrypt(secret);

            if (existingWebhook) {
                await existingWebhook.update({
                    userId,
                    subscriptionId,
                    status: 'verification_pending',
                    secret: encryptedSecret,
                    callbackUrl,
                    registeredAt: new Date()
                });
                logger.info({ broadcasterId, type }, 'Twitch Webhooks: Suscripción actualizada (pendiente de verificación)');
            } else {
                await TwitchWebhook.create({
                    userId,
                    broadcasterId,
                    subscriptionId,
                    type,
                    status: 'verification_pending',
                    secret: encryptedSecret,
                    callbackUrl,
                    registeredAt: new Date()
                });
                logger.info({ broadcasterId, type }, 'Twitch Webhooks: Nueva suscripción creada (pendiente de verificación)');
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { status?: number, message?: string }, status?: number }, message: string };

            if (axiosError.response?.status === 409) {
                logger.warn({ broadcasterId, type }, 'Twitch Webhooks: Conflicto 409 detectado. Intentando limpiar y resincronizar...');

                try {
                    // Buscar en TODAS las suscripciones (activas, pendientes, etc)
                    const allSubs = await TwitchEventSubClient.listSubscriptions();

                    const conflict = allSubs.find(s => {
                        return s.type === type && (
                            s.condition.broadcaster_user_id === broadcasterId ||
                            s.condition.user_id === broadcasterId ||
                            s.condition.to_broadcaster_user_id === broadcasterId
                        );
                    });

                    if (conflict) {
                        logger.info({ subscriptionId: conflict.id, type, status: conflict.status }, 'Twitch Webhooks: Eliminando suscripción conflictiva antigua');
                        await TwitchEventSubClient.deleteSubscription(conflict.id);
                    } else {
                        logger.warn({ type, broadcasterId }, 'Twitch Webhooks: Conflicto 409 reportado pero no se encontró suscripción coincidente en la lista');
                    }

                    const newSecret = TwitchWebhookService.generateSecret();
                    const encryptedRetrySecret = this.encryptionService.encrypt(newSecret);

                    // Aumentar delay a 3s para dar tiempo a Twitch de propagar el borrado
                    await new Promise(resolve => setTimeout(resolve, 3000));


                    const retrySub = await TwitchEventSubClient.subscribe(
                        type, version, condition, callbackUrl, newSecret
                    );

                    const newId = retrySub.data?.[0]?.id || null;

                    if (existingWebhook) {
                        await existingWebhook.update({
                            userId,
                            subscriptionId: newId,
                            status: 'verification_pending',
                            secret: encryptedRetrySecret,
                            callbackUrl,
                            registeredAt: new Date()
                        });
                    } else {
                        await TwitchWebhook.create({
                            userId, broadcasterId, subscriptionId: newId,
                            type, status: 'verification_pending',
                            secret: encryptedRetrySecret, callbackUrl,
                            registeredAt: new Date()
                        });
                    }
                    logger.info({ broadcasterId, type }, 'Twitch Webhooks: Resincronización completada tras conflicto');
                    return;

                } catch (retryError) {
                    logger.error({ err: retryError, type }, 'Twitch Webhooks: Error fatal intentando resolver conflicto 409');
                }
            } else {
                logger.error({ err: axiosError.response?.data || axiosError.message, type }, 'Error en ensureSubscription de Twitch');
            }
        }
    }

    async deleteAllSubscriptions(broadcasterId: string): Promise<void> {
        try {
            logger.info({ broadcasterId }, 'Twitch Webhooks: Eliminando todas las suscripciones por desconexión');

            const webhooks = await TwitchWebhook.findAll({
                where: { broadcasterId }
            });

            for (const webhook of webhooks) {
                if (webhook.subscriptionId) {
                    await TwitchEventSubClient.deleteSubscription(webhook.subscriptionId)
                        .catch(err => logger.error({ err, id: webhook.subscriptionId }, 'Error eliminando suscripción en Twitch API'));
                }
            }

            await TwitchWebhook.destroy({
                where: { broadcasterId }
            });

            logger.info({ broadcasterId }, 'Twitch Webhooks: Limpieza profunda completada');
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Twitch Webhooks: Error durante el borrado masivo');
        }
    }

    async syncSubscriptionsOnStartup(): Promise<void> {
        if (!config.appUrl?.startsWith('https://')) {
            logger.warn('Twitch Sync: APP_URL no es HTTPS, omitiendo sincronización.');
            return;
        }

        const currentCallbackUrl = `${config.appUrl}/api/webhooks/twitch`;
        logger.info({ currentCallbackUrl }, 'Twitch Sync: Iniciando sincronización inteligente...');

        try {
            const twitchSubs = await TwitchEventSubClient.listSubscriptions();
            let validCount = 0;
            let deletedCount = 0;

            for (const sub of twitchSubs) {
                const existingDbWebhook = await TwitchWebhook.findOne({
                    where: { subscriptionId: sub.id }
                });

                if (!existingDbWebhook) {
                    logger.info({ id: sub.id, type: sub.type }, 'Twitch Sync: Borrando suscripción huérfana (sin secreto local)');
                    await TwitchEventSubClient.deleteSubscription(sub.id);
                    deletedCount++;
                    continue;
                }

                const subWithTransport = sub as unknown as { transport?: { callback?: string } };
                const transport = subWithTransport.transport;
                const twitchCallback = transport?.callback;

                if (twitchCallback && twitchCallback !== currentCallbackUrl) {
                    logger.info({ id: sub.id, oldUrl: twitchCallback }, 'Twitch Sync: Borrando suscripción con URL obsoleta');
                    await TwitchEventSubClient.deleteSubscription(sub.id);
                    await existingDbWebhook.update({ status: 'revoked' });
                    deletedCount++;
                    continue;
                }

                if (existingDbWebhook.status !== sub.status) {
                    await existingDbWebhook.update({ status: sub.status });
                    logger.debug({ id: sub.id, status: sub.status }, 'Twitch Sync: Estado actualizado en DB');
                }

                validCount++;
            }

            logger.info({ valid: validCount, deleted: deletedCount }, 'Twitch Sync: Sincronización completada.');
        } catch (error) {
            logger.error({ err: error }, 'Twitch Sync: Error durante la sincronización inicial');
        }
    }
}