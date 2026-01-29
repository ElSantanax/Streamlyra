/** Descubridor de broadcast en vivo de YouTube con detección de cuota agotada */

import axios from 'axios';
import { YouTubeBroadcast, YouTubeBroadcastResponse } from '../../../types/youtube.types';
import { logger } from '../../../utils/logger';

export class YouTubeBroadcastDiscovery {
    async findLiveBroadcast(accessToken: string): Promise<YouTubeBroadcast | null> {
        try {
            const response = await axios.get<YouTubeBroadcastResponse>('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
                params: { part: 'snippet,status,id', mine: true, broadcastType: 'all', maxResults: 1 },
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const broadcast = response.data.items?.find((b: YouTubeBroadcast) =>
                b.status.lifeCycleStatus === 'live'
            ) || null;

            if (broadcast) {
                logger.info({ broadcastId: broadcast.id }, 'Live broadcast found');
            }

            return broadcast;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                logger.warn(
                    { 
                        err: error,
                        message: 'CUOTA DE YOUTUBE AGOTADA - El usuario debe esperar hasta que se renueve la cuota diaria'
                    }, 
                    'YouTube API quota exceeded - Daily quota exhausted'
                );
                throw new Error('YOUTUBE_QUOTA_EXCEEDED');
            } else {
                logger.error({ err: error }, 'Error discovering YouTube broadcast');
            }
            return null;
        }
    }
}
