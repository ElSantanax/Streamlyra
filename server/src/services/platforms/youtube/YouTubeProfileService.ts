/** Servicio de gestión de perfiles de YouTube */

import axios from 'axios';
import { logger } from '../../../utils/logger';
import { YouTubeQuotaManager } from '../YouTubeQuotaManager';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';
import { YouTubeChannelResponse } from '../../../types/youtube.types';
import { YouTubeTokenDecoder } from './YouTubeTokenDecoder';
import { YouTubeQuotaErrorHandler } from './YouTubeQuotaErrorHandler';
import { PlatformProfile } from '../../base/BasePlatformService';

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

export class YouTubeProfileService {
    private readonly platformName = 'youtube';

    async fetchUserProfile(accessToken: string): Promise<YouTubeChannel> {
        const quotaManager = YouTubeQuotaManager.getInstance();
        const cost = YouTubePollingConfig.OPERATION_COSTS.CHANNEL_INFO;

        // Si no hay cuota, usar perfil básico del token JWT
        if (!(await quotaManager.hasQuota(cost))) {
            logger.warn({ platform: this.platformName }, 'YouTube quota exhausted, using basic profile from token');
            return YouTubeTokenDecoder.getBasicProfileFromToken(accessToken);
        }

        try {
            logger.debug({ platform: this.platformName }, 'Fetching YouTube user profile');

            const userResponse = await axios.get<YouTubeChannelResponse>(
                'https://www.googleapis.com/youtube/v3/channels',
                {
                    params: { part: 'snippet', mine: true },
                    headers: { Authorization: `Bearer ${accessToken}` },
                    timeout: 10000
                }
            );

            await quotaManager.consumeQuota(cost);

            const items = userResponse.data.items;

            if (!items || items.length === 0) {
                logger.error({ platform: this.platformName }, 'No YouTube channel found');
                throw new Error('No se encontró canal de YouTube asociado.');
            }

            logger.debug({ platform: this.platformName, channelId: items[0].id }, 'YouTube profile fetched successfully');
            return items[0];
        } catch (error: unknown) {
            // Si es error de cuota, usar perfil básico en lugar de fallar
            if (YouTubeQuotaErrorHandler.isQuotaError(error)) {
                logger.warn({ platform: this.platformName }, 'YouTube quota exceeded, falling back to basic profile');
                return YouTubeTokenDecoder.getBasicProfileFromToken(accessToken);
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const axiosError = error && typeof error === 'object' && 'response' in error
                ? error as { response?: { status?: number; data?: unknown } }
                : undefined;

            logger.error({
                platform: this.platformName,
                error: errorMessage,
                status: axiosError?.response?.status,
                data: axiosError?.response?.data
            }, 'Error fetching YouTube profile');
            throw error;
        }
    }

    normalizePlatformProfile(channel: YouTubeChannel): PlatformProfile {
        return {
            provider: 'youtube',
            providerId: channel.id,
            providerUsername: channel.snippet.title
                .replace(/\s+/g, '')
                .toLowerCase()
                .substring(0, 15),
            displayName: channel.snippet.title,
            avatarUrl: channel.snippet.thumbnails?.default?.url || ''
        };
    }
}
