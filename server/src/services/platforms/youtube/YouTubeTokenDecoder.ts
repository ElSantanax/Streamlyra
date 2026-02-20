import { logger } from '../../../utils/logger';

interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        thumbnails?: {
            default?: {
                url: string;
            };
        };
    };
}

export class YouTubeTokenDecoder {
    static getBasicProfileFromToken(accessToken: string): YouTubeChannel {
        try {
            const payloadBase64 = accessToken.split('.')[1];
            if (!payloadBase64) {
                throw new Error('Invalid token format');
            }

            const payloadString = Buffer.from(payloadBase64, 'base64').toString();
            const payload = JSON.parse(payloadString) as { sub?: string };

            const channelId = payload.sub || `yt_${Date.now()}`;

            logger.info({ channelId }, 'Using basic YouTube profile from token');

            return {
                id: channelId,
                snippet: {
                    title: `YouTube User ${channelId.substring(0, 8)}`,
                    thumbnails: {
                        default: {
                            url: ''
                        }
                    }
                }
            };
        } catch (error) {
            logger.error({ err: error }, 'Failed to decode YouTube token, using fallback profile');

            const fallbackId = `yt_${Date.now()}`;
            return {
                id: fallbackId,
                snippet: {
                    title: `YouTube User ${fallbackId.substring(0, 8)}`,
                    thumbnails: {
                        default: {
                            url: ''
                        }
                    }
                }
            };
        }
    }
}