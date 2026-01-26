/**
 * Gestor de Canal de Kick
 * Responsabilidad: Obtener información del canal de Kick
 */

import { KickService } from '../../platforms/KickService';
import { logger } from '../../../utils/logger';

export class KickChannelManager {
    async getChannelInfo(accessToken: string): Promise<{ broadcasterId: string; slug: string } | null> {
        try {
            const channels = await KickService.getChannelByToken(accessToken);
            if (!channels?.length) {
                logger.error({}, 'No Kick channel found');
                return null;
            }

            const { broadcaster_user_id, slug } = channels[0];
            if (!broadcaster_user_id) {
                logger.error({}, 'Kick broadcaster_user_id is null');
                return null;
            }

            return {
                broadcasterId: broadcaster_user_id.toString(),
                slug: slug || ''
            };
        } catch (error) {
            logger.error({ err: error }, 'Error getting Kick channel info');
            return null;
        }
    }
}
