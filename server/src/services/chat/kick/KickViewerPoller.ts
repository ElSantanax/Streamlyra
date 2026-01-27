/**
 * Encuestador de Espectadores de Kick
 * Responsabilidad: Hacer polling de espectadores en vivo
 */

import { Server } from 'socket.io';
import { PollingManager } from '../PollingManager';
import { KickService } from '../../platforms/KickService';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class KickViewerPoller {
    private polling: PollingManager = new PollingManager();

    startPolling(userId: string, accessToken: string, io: Server): void {
        this.polling.start(userId, async () => {
            try {
                // Usar KickService.getChannelByToken() que incluye los headers correctos
                const channels = await KickService.getChannelByToken(accessToken);

                if (channels && channels.length > 0) {
                    const streamData = channels[0].stream;
                    const viewerCount = streamData?.viewer_count || 0;
                    SafeSocketEmitter.emitViewersUpdate(io, userId, 'kick', viewerCount);
                }
            } catch (error) {
                logger.error({ err: error, userId }, 'Kick viewer polling error');
            }
        }, 30000); // Poll every 30 seconds
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
    }

    isPolling(userId: string): boolean {
        return this.polling.isRunning(userId);
    }
}
