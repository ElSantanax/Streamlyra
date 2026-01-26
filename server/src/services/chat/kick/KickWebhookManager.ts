/**
 * Gestor de Webhook de Kick
 * Responsabilidad: Registrar webhook para eventos de Kick y trackear en DB
 */

import { KickService } from '../../platforms/KickService';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { logger } from '../../../utils/logger';

export class KickWebhookManager {
    /**
     * Registra un webhook de Kick, reutilizando uno existente si está disponible
     * 
     * Estrategia MEJORADA:
     * 1. Verificar si existe webhook ACTIVO -> Reutilizar
     * 2. Verificar si existe webhook INACTIVO -> Reactivar
     * 3. Si no existe ninguno -> Crear nuevo
     * 
     * Esto previene acumulación de webhooks en la DB
     */
    async registerWebhook(userId: string, accessToken: string, broadcasterId: string): Promise<void> {
        try {
            if (!process.env.APP_URL?.startsWith('https://')) {
                logger.warn({}, 'APP_URL is not HTTPS, webhooks disabled');
                return;
            }

            const appUrl = process.env.APP_URL;
            const callbackUrl = `${appUrl}/api/webhooks/kick`;

            // 1. Verificar si ya existe un webhook ACTIVO
            const activeWebhook = await KickWebhook.findOne({
                where: {
                    broadcasterId,
                    isActive: true
                }
            });

            if (activeWebhook) {
                logger.info(
                    { 
                        userId, 
                        broadcasterId, 
                        webhookId: activeWebhook.id,
                        registeredAt: activeWebhook.registeredAt 
                    }, 
                    'Reutilizando webhook activo existente de Kick'
                );
                return;
            }

            // 2. Verificar si existe un webhook INACTIVO que podemos reactivar
            const inactiveWebhook = await KickWebhook.findOne({
                where: {
                    broadcasterId,
                    isActive: false
                },
                order: [['deactivatedAt', 'DESC']] // El más reciente
            });

            if (inactiveWebhook) {
                // Reactivar el webhook existente
                inactiveWebhook.isActive = true;
                inactiveWebhook.deactivatedAt = null;
                inactiveWebhook.registeredAt = new Date();
                await inactiveWebhook.save();

                logger.info(
                    { 
                        userId, 
                        broadcasterId, 
                        webhookId: inactiveWebhook.id,
                        originalRegisteredAt: inactiveWebhook.registeredAt 
                    }, 
                    'Reactivando webhook inactivo de Kick (no se crea duplicado)'
                );
                return;
            }

            // 3. No existe ningún webhook, crear uno nuevo
            logger.info({ userId, broadcasterId, callbackUrl }, 'Registrando nuevo webhook de Kick (primera vez)');
            await KickService.subscribeToChat(accessToken, broadcasterId, callbackUrl);

            // Guardar en DB
            await KickWebhook.create({
                userId,
                broadcasterId,
                callbackUrl,
                isActive: true,
                registeredAt: new Date(),
                lastEventAt: null,
                deactivatedAt: null
            });

            logger.info({ userId, broadcasterId }, 'Webhook de Kick registrado y guardado en DB');
        } catch (error) {
            logger.error({ err: error, userId, broadcasterId }, 'Error registrando webhook de Kick');
        }
    }

    /**
     * Marca un webhook como inactivo (no lo desregistra porque Kick no lo permite)
     */
    async deactivateWebhook(broadcasterId: string): Promise<void> {
        try {
            const webhook = await KickWebhook.findOne({
                where: {
                    broadcasterId,
                    isActive: true
                }
            });

            if (webhook) {
                webhook.isActive = false;
                webhook.deactivatedAt = new Date();
                await webhook.save();

                logger.info(
                    { 
                        webhookId: webhook.id, 
                        broadcasterId 
                    }, 
                    'Webhook de Kick marcado como inactivo'
                );
            }
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Error desactivando webhook de Kick');
        }
    }

    /**
     * Actualiza el timestamp del último evento recibido
     */
    async updateLastEvent(broadcasterId: string): Promise<void> {
        try {
            await KickWebhook.update(
                { lastEventAt: new Date() },
                {
                    where: {
                        broadcasterId,
                        isActive: true
                    }
                }
            );
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Error actualizando lastEventAt');
        }
    }
}
