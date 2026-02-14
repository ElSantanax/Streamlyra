/** Gestor avanzado de suscripciones de Twitch EventSub */

import { TwitchEventSubClient } from '../../platforms/TwitchEventSubClient';
import { TwitchWebhook } from '../../../models/TwitchWebhook.model';
import { TwitchWebhookService } from './TwitchWebhookService';
import { logger } from '../../../utils/logger';
import { config } from '../../../config';

export class TwitchManager {
    /**
     * Lista de eventos a los que nos suscribiremos por defecto para cada canal
     */
    private readonly EVENT_TYPES = [
        { type: 'channel.follow', version: '2' },
        { type: 'channel.subscribe', version: '1' },
        { type: 'channel.raid', version: '1' },
        { type: 'channel.chat.message', version: '1' },
        { type: 'stream.online', version: '1' },
        { type: 'stream.offline', version: '1' }
    ];

    /**
     * Registra o actualiza todas las suscripciones de EventSub para un usuario
     */
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

    /**
     * Asegura que una suscripción específica exista y esté activa
     */
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

            // Si ya existe y está habilitado con la misma URL, no hacemos nada
            if (existingWebhook?.status === 'enabled' && existingWebhook.callbackUrl === callbackUrl) {
                logger.debug({ broadcasterId, type }, 'Twitch Webhooks: Suscripción ya activa');
                return;
            }

            // Generar o recuperar secreto
            const secret = existingWebhook?.secret || TwitchWebhookService.generateSecret();

            // Preparar condición de forma específica por tipo de evento (Twitch es estricto con esto)
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

            // Llamar a la API de Twitch
            const subscription = await TwitchEventSubClient.subscribe(
                type,
                version,
                condition,
                callbackUrl,
                secret
            );

            const subscriptionId = subscription.data?.[0]?.id || null;

            if (existingWebhook) {
                await existingWebhook.update({
                    userId,
                    subscriptionId,
                    status: 'verification_pending',
                    secret,
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
                    secret,
                    callbackUrl,
                    registeredAt: new Date()
                });
                logger.info({ broadcasterId, type }, 'Twitch Webhooks: Nueva suscripción creada (pendiente de verificación)');
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { status?: number, message?: string } }, message: string };
            const errorData = axiosError.response?.data;

            // Manejo de Conflictos (409): La suscripción ya existe en Twitch pero tal vez con otro secreto o estado
            if (errorData?.status === 409) {
                logger.warn({ broadcasterId, type }, 'Twitch Webhooks: Conflicto 409 detectado. Intentando limpiar y resincronizar...');

                try {
                    // 1. Listar todas las suscripciones actuales del canal
                    const subscriptions = await TwitchEventSubClient.listSubscriptions();

                    // 2. Buscar la que coincide con este tipo y broadcasterId
                    // Twitch devuelve broadcaster_user_id, to_broadcaster_user_id o user_id según el tipo
                    const conflict = subscriptions.find(s => {
                        if (s.type !== type) return false;
                        const cond = s.condition;
                        return cond['broadcaster_user_id'] === broadcasterId ||
                            cond['to_broadcaster_user_id'] === broadcasterId ||
                            cond['user_id'] === broadcasterId;
                    });

                    if (conflict) {
                        logger.info({ subscriptionId: conflict.id, type }, 'Twitch Webhooks: Eliminando suscripción conflictiva antigua');
                        await TwitchEventSubClient.deleteSubscription(conflict.id);

                        // 3. Reintentar la suscripción una sola vez
                        // Generar nuevo secreto para estar seguros
                        const newSecret = TwitchWebhookService.generateSecret();
                        const retrySub = await TwitchEventSubClient.subscribe(
                            type, version, condition, callbackUrl, newSecret
                        );

                        const newId = retrySub.data?.[0]?.id || null;

                        if (existingWebhook) {
                            await existingWebhook.update({
                                userId,
                                subscriptionId: newId,
                                status: 'verification_pending',
                                secret: newSecret,
                                callbackUrl,
                                registeredAt: new Date()
                            });
                        } else {
                            await TwitchWebhook.create({
                                userId, broadcasterId, subscriptionId: newId,
                                type, status: 'verification_pending',
                                secret: newSecret, callbackUrl,
                                registeredAt: new Date()
                            });
                        }
                        logger.info({ broadcasterId, type }, 'Twitch Webhooks: Resincronización completada tras conflicto');
                        return;
                    }
                } catch (retryError) {
                    logger.error({ err: retryError, type }, 'Twitch Webhooks: Error fatal intentando resolver conflicto 409');
                }
            } else {
                logger.error({ err: errorData || axiosError.message, type }, 'Error en ensureSubscription de Twitch');
            }
        }
    }

    /**
     * Elimina todas las suscripciones de EventSub para un canal
     */
    async deleteAllSubscriptions(broadcasterId: string): Promise<void> {
        try {
            logger.info({ broadcasterId }, 'Twitch Webhooks: Eliminando todas las suscripciones por desconexión');

            // 1. Obtener webhooks de la base de datos
            const webhooks = await TwitchWebhook.findAll({
                where: { broadcasterId }
            });

            for (const webhook of webhooks) {
                if (webhook.subscriptionId) {
                    await TwitchEventSubClient.deleteSubscription(webhook.subscriptionId)
                        .catch(err => logger.error({ err, id: webhook.subscriptionId }, 'Error eliminando suscripción en Twitch API'));
                }
            }

            // 2. Limpiar registros de la BD
            await TwitchWebhook.destroy({
                where: { broadcasterId }
            });

            logger.info({ broadcasterId }, 'Twitch Webhooks: Limpieza profunda completada');
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Twitch Webhooks: Error durante el borrado masivo');
        }
    }
}
