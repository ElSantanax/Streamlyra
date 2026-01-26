/**
 * Gestor de Webhook de Kick
 * Responsabilidad: Registrar webhook para eventos de Kick
 */

import { KickService } from '../../platforms/KickService';
import { logger } from '../../../utils/logger';

export class KickWebhookManager {
    async registerWebhook(accessToken: string, broadcasterId: string): Promise<void> {
        try {
            if (!process.env.APP_URL?.startsWith('https://')) {
                logger.warn({}, 'APP_URL is not HTTPS, webhooks disabled');
                return;
            }

            const appUrl = process.env.APP_URL;
            const callbackUrl = `${appUrl}/api/webhooks/kick`;

            logger.info({ broadcasterId, callbackUrl }, 'Registering Kick webhook');
            await KickService.subscribeToChat(accessToken, broadcasterId, callbackUrl);
            logger.info({ broadcasterId }, 'Kick webhook registered');
        } catch (error) {
            logger.error({ err: error, broadcasterId }, 'Error registering Kick webhook');
        }
    }
}
