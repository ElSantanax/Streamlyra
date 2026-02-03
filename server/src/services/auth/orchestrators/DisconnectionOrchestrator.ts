/** Orquestador de desconexión de plataformas y logout global */

import { ConnectionService } from '../../connection/ConnectionService';
import { AuthChatOrchestrator } from '../AuthChatOrchestrator';
import { Platform } from '../../../constants/platforms';
import { logger } from '../../../utils/logger';

export class DisconnectionOrchestrator {
    constructor(
        private connectionService: ConnectionService,
        private chatOrchestrator: AuthChatOrchestrator
    ) { }

    async disconnectPlatform(userId: string, provider: Platform): Promise<boolean> {
        logger.info({ userId, provider }, 'DisconnectionOrchestrator: Starting platform disconnection');

        const deletedCount = await this.connectionService.removeConnection(userId, provider);

        if (deletedCount === 0) {
            logger.info({ userId, provider }, 'DisconnectionOrchestrator: Connection already removed or not found (Idempotent success)');
            // El objetivo ya se cumplió o el registro no existía. Retornamos true para limpiar UI.
            return true;
        }

        logger.info(
            { userId, provider, deletedCount },
            'DisconnectionOrchestrator: Connection removed from database'
        );

        await this.chatOrchestrator.disconnect(userId, provider);

        logger.info({ userId, provider }, 'DisconnectionOrchestrator: Platform disconnection completed');

        return true;
    }

    async logout(userId: string | undefined): Promise<void> {
        if (!userId) return;

        logger.info({ userId }, 'DisconnectionOrchestrator: Starting global logout cleanup');

        try {
            await this.chatOrchestrator.disconnectAll(userId);
            logger.info({ userId }, 'DisconnectionOrchestrator: Global logout cleanup completed');
        } catch (error) {
            logger.error({ err: error, userId }, 'DisconnectionOrchestrator: Error during logout cleanup');
        }
    }
}
