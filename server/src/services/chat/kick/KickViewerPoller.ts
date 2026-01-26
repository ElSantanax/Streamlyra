/**
 * Encuestador de Espectadores de Kick
 * Responsabilidad: Hacer polling de espectadores en vivo
 */

import axios, { AxiosError } from 'axios';
import { Server } from 'socket.io';
import { KickApiResponse, KickChannel } from '../../../types/kick.types';
import { PollingManager } from '../PollingManager';
import { logger } from '../../../utils/logger';

export class KickViewerPoller {
    private polling: PollingManager = new PollingManager();

    startPolling(userId: string, accessToken: string, io: Server): void {
        this.polling.start(userId, async () => {
            try {
                const response = await axios.get<KickApiResponse<KickChannel[]>>('https://api.kick.com/public/v1/channels', {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    timeout: 5000
                });

                if (response.data.data && response.data.data.length > 0) {
                    const streamData = response.data.data[0].stream;
                    const viewerCount = streamData?.viewer_count || 0;
                    io.to(userId).emit('viewers_update', {
                        platform: 'kick',
                        count: viewerCount
                    });
                }
            } catch (error) {
                const axiosErr = error as AxiosError;
                logger.error({ status: axiosErr.response?.status, message: axiosErr.message }, 'Kick viewer polling error');
            }
        }, 5000);
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
    }
}
