/** Decodificador de tokens JWT de YouTube para obtener información básica del perfil */

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
    /**
     * Obtiene información básica del perfil desde el token JWT de YouTube
     * Se usa como fallback cuando la cuota está agotada
     */
    static getBasicProfileFromToken(accessToken: string): YouTubeChannel {
        try {
            // Decodificar el JWT para obtener información básica
            const payloadBase64 = accessToken.split('.')[1];
            if (!payloadBase64) {
                throw new Error('Invalid token format');
            }

            const payloadString = Buffer.from(payloadBase64, 'base64').toString();
            const payload = JSON.parse(payloadString) as { sub?: string };

            // YouTube incluye el channel ID en el token
            const channelId = payload.sub || `yt_${Date.now()}`;

            logger.info({ channelId }, 'Using basic YouTube profile from token due to quota limits');

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

            // Fallback completo si no se puede decodificar el token
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
