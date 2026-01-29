/** Encuestador de espectadores de Twitch con polling de estadísticas de stream */

import axios from 'axios';
import { Server } from 'socket.io';
import { TwitchStreamResponse } from '../../../types/twitch.types';
import { PollingManager } from '../PollingManager';
import { config } from '../../../config';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

export class TwitchViewerPoller {
    private polling: PollingManager = new PollingManager();

    startPolling(userId: string, username: string, accessToken: string, io: Server): void {
        this.polling.start(userId, async () => {
            try {
                const response = await axios.get<TwitchStreamResponse>('https://api.twitch.tv/helix/streams', {
                    params: { user_login: username },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-Id': config.twitch.clientId!
                    }
                });

                const stream = response.data.data[0];
                SafeSocketEmitter.emitViewersUpdate(
                    io,
                    userId,
                    'twitch',
                    stream ? stream.viewer_count : 0
                );

            } catch (error) {
                logger.error({ err: error }, 'Twitch viewer polling error');
            }
        });
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
    }
}
