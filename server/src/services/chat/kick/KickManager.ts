/** Gestor unificado de Kick con canal, espectadores y webhooks centralizados */

import { Server } from 'socket.io';
import { KickService } from '../../platforms/KickService';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { PollingManager } from '../shared/PollingManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { config } from '../../../config';

export class KickManager {
    private poller: PollingManager = new PollingManager();

    async getChannelInfo(accessToken: string, userId?: string, io?: Server): Promise<{ broadcasterId: string; slug: string; viewerCount: number } | null> {
        try {
            const channels = await KickService.getChannels(accessToken);
            if (!channels?.length) {
                logger.error({}, 'No Kick channel found');
                return null;
            }

            const channel = channels[0];
            const broadcasterId = channel.broadcaster_user_id?.toString();
            const slug = channel.slug || '';
            const viewerCount = channel.stream?.viewer_count || 0;

            if (!broadcasterId) {
                logger.error({}, 'Kick broadcaster_user_id is null');
                return null;
            }

            if (io && userId) {
                SafeSocketEmitter.emitViewersUpdate(io, userId, 'kick', viewerCount);
            }

            return { broadcasterId, slug, viewerCount };
        } catch (error) {
            logger.error({ err: error }, 'Error getting Kick channel info');
            return null;
        }
    }

    startViewerPolling(userId: string, accessToken: string, io: Server): void {
        this.poller.start(userId, async () => {
            try {
                const info = await this.getChannelInfo(accessToken, userId, io);
                if (!info) {
                    logger.debug({ userId }, 'Kick polling: could not get channel info');
                }
            } catch (error) {
                logger.error({ err: error, userId }, 'Kick viewer polling error');
            }
        }, 30000);
    }

    stopViewerPolling(userId: string): void {
        this.poller.stop(userId);
    }

    isPolling(userId: string): boolean {
        return this.poller.isRunning(userId);
    }

    async registerWebhook(userId: string, accessToken: string, broadcasterId: string): Promise<void> {
        try {
            if (!config.appUrl?.startsWith('https://')) {
                logger.warn({ broadcasterId }, 'Kick Webhooks: APP_URL no es HTTPS, suscripción omitida');
                return;
            }

            const callbackUrl = `${config.appUrl}/api/webhooks/kick`;

            const existingWebhook = await KickWebhook.findOne({
                where: { broadcasterId }
            });

            // Si ya existe y tiene la misma URL y está activo, no hacemos nada
            if (existingWebhook?.isActive && existingWebhook.callbackUrl === callbackUrl) {
                logger.debug({ userId, broadcasterId }, 'Kick Webhooks: Webhook ya está activo y con la URL correcta');
                return;
            }

            // Si la URL cambió o no estaba activo, necesitamos (re)suscribir en Kick
            logger.info(
                { userId, broadcasterId, oldUrl: existingWebhook?.callbackUrl, newUrl: callbackUrl },
                'Kick Webhooks: Suscribiendo/Actualizando webhook en la plataforma'
            );

            await KickService.subscribeToWebhook(accessToken, broadcasterId, callbackUrl);

            if (existingWebhook) {
                // Actualizar el existente
                await existingWebhook.update({
                    callbackUrl,
                    isActive: true,
                    deactivatedAt: null,
                    registeredAt: new Date(),
                    userId // Asegurar que sea el userId actual
                });
                logger.info({ userId, broadcasterId }, 'Kick Webhooks: Webhook existente actualizado y reactivado');
            } else {
                // Crear uno nuevo
                await KickWebhook.create({
                    userId,
                    broadcasterId,
                    callbackUrl,
                    isActive: true,
                    registeredAt: new Date()
                });
                logger.info({ userId, broadcasterId }, 'Kick Webhooks: Nuevo webhook creado y suscrito');
            }
        } catch (error) {
            logger.error({ err: error, userId, broadcasterId }, 'Kick Webhooks: Error crítico durante el registro');
        }
    }

    async deactivateWebhook(broadcasterId: string): Promise<void> {
        try {
            await KickWebhook.update(
                { isActive: false, deactivatedAt: new Date() },
                { where: { broadcasterId, isActive: true } }
            );
            logger.info({ broadcasterId }, 'Webhook de Kick marcado como inactivo');
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Error desactivando webhook de Kick');
        }
    }
}
