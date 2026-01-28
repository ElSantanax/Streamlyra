/**
 * Gestor Unificado de Kick
 * Responsabilidad: Centralizar toda la lógica de Kick (Canal, Espectadores y Webhooks)
 * 
 * MEJORAS:
 * - Reduce duplicación de llamadas a la API de Kick
 * - Centraliza la gestión de estado de Kick para un usuario
 * - Simplifica la interfaz para KickChatProvider
 */

import { Server } from 'socket.io';
import { KickService } from '../../platforms/KickService';
import { KickWebhook } from '../../../models/KickWebhook.model';
import { PollingManager } from '../PollingManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class KickManager {
    private poller: PollingManager = new PollingManager();

    /**
     * Obtiene información del canal y actualiza el conteo de espectadores si es necesario
     */
    async getChannelInfo(accessToken: string, userId?: string, io?: Server): Promise<{ broadcasterId: string; slug: string; viewerCount: number } | null> {
        try {
            const channels = await KickService.getChannelByToken(accessToken);
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

            // Si se proporciona IO y userId, emitir actualización inmediata
            if (io && userId) {
                SafeSocketEmitter.emitViewersUpdate(io, userId, 'kick', viewerCount);
            }

            return { broadcasterId, slug, viewerCount };
        } catch (error) {
            logger.error({ err: error }, 'Error getting Kick channel info');
            return null;
        }
    }

    /**
     * Inicia el polling de espectadores usando el token de acceso
     */
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
        }, 30000); // Polling cada 30 segundos
    }

    stopViewerPolling(userId: string): void {
        this.poller.stop(userId);
    }

    isPolling(userId: string): boolean {
        return this.poller.isRunning(userId);
    }

    /**
     * Gestión de Webhooks (Migrado de KickWebhookManager)
     */
    async registerWebhook(userId: string, accessToken: string, broadcasterId: string): Promise<void> {
        try {
            if (!process.env.APP_URL?.startsWith('https://')) {
                logger.warn({}, 'APP_URL is not HTTPS, webhooks disabled');
                return;
            }

            const callbackUrl = `${process.env.APP_URL}/api/webhooks/kick`;

            // Verificar si ya existe un webhook activo o inactivo para reutilizar
            const existingWebhook = await KickWebhook.findOne({
                where: { broadcasterId }
            });

            if (existingWebhook?.isActive) {
                logger.info({ userId, broadcasterId }, 'Reutilizando webhook activo existente de Kick');
                return;
            }

            if (existingWebhook) {
                // Reactivar
                existingWebhook.isActive = true;
                existingWebhook.deactivatedAt = null;
                existingWebhook.registeredAt = new Date();
                await existingWebhook.save();
                logger.info({ userId, broadcasterId }, 'Reactivando webhook inactivo de Kick');
                return;
            }

            // Crear nuevo
            logger.info({ userId, broadcasterId }, 'Suscribiendo nuevo webhook de Kick');
            await KickService.subscribeToChat(accessToken, broadcasterId, callbackUrl);

            await KickWebhook.create({
                userId,
                broadcasterId,
                callbackUrl,
                isActive: true,
                registeredAt: new Date()
            });
        } catch (error) {
            logger.error({ err: error, userId, broadcasterId }, 'Error registrando webhook de Kick');
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
