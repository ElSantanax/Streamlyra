import { Server } from 'socket.io';
import { KickService } from '../../platforms/KickService';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { PollingManager } from '../shared/PollingManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { config } from '../../../config';
import { WebhookCache } from '../../webhook/WebhookCache';

import { KickPollingConfig } from '../../../config/kick.polling.config';

export class KickManager {
    private poller: PollingManager = new PollingManager();

    async getChannelInfo(accessToken: string, userId?: string, io?: Server): Promise<{ broadcasterId: string; slug: string; viewerCount: number; isLive: boolean } | null> {
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

            const isLive = !!channel.stream?.is_live;

            logger.debug(
                {
                    userId,
                    slug,
                    broadcasterId,
                    hasStream: !!channel.stream,
                    isLiveProp: channel.stream?.is_live,
                    finalIsLive: isLive,
                    viewerCount
                },
                'Kick Channel API Result'
            );

            if (io && userId) {
                SafeSocketEmitter.emitViewersUpdate(io, userId, 'kick', viewerCount, isLive);
            }

            return { broadcasterId, slug, viewerCount, isLive };
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
        }, KickPollingConfig.VIEWER_POLLING_INTERVAL_MS);
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

            if (existingWebhook?.isActive && existingWebhook.callbackUrl === callbackUrl) {
                logger.debug({ userId, broadcasterId }, 'Kick Webhooks: Webhook ya está activo y con la URL correcta');
                return;
            }

            logger.info(
                { userId, broadcasterId, oldUrl: existingWebhook?.callbackUrl, newUrl: callbackUrl },
                'Kick Webhooks: Suscribiendo/Actualizando webhook en la plataforma'
            );

            await KickService.subscribeToWebhook(accessToken, broadcasterId);

            if (existingWebhook) {
                await existingWebhook.update({
                    callbackUrl,
                    isActive: true,
                    deactivatedAt: null,
                    registeredAt: new Date(),
                    userId
                });
                logger.info({ userId, broadcasterId }, 'Kick Webhooks: Webhook existente actualizado y reactivado');
            } else {
                await KickWebhook.create({
                    userId,
                    broadcasterId,
                    callbackUrl,
                    isActive: true,
                    registeredAt: new Date()
                });
                logger.info({ userId, broadcasterId }, 'Kick Webhooks: Nuevo webhook creado y suscrito');
            }

            WebhookCache.getInstance().invalidate(WebhookCache.keys.webhook('kick', broadcasterId));
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

            WebhookCache.getInstance().invalidate(WebhookCache.keys.webhook('kick', broadcasterId));
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Error desactivando webhook de Kick');
        }
    }
}