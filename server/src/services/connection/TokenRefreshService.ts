/** Servicio de renovación de tokens OAuth con verificación de expiración */

import { Connection } from '../../models/Connection.model';
import { ConnectionRepository } from '../../repositories/implementations/ConnectionRepository';
import { TwitchService } from '../platforms/TwitchService';
import { YouTubeService } from '../platforms/YouTubeService';
import { KickService } from '../platforms/KickService';
import { Platform } from '../../constants/platforms';
import { logger } from '../../utils/logger';
import { calculateTokenExpiry } from '../../utils/tokenUtils';

type OAuthPlatform = 'twitch' | 'youtube' | 'kick';

interface PlatformService {
    refreshAccessToken(refreshToken: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    }>;
}

const PLATFORM_SERVICES: Record<OAuthPlatform, PlatformService> = {
    twitch: new TwitchService(),
    youtube: new YouTubeService(),
    kick: new KickService()
};

export class TokenRefreshService {
    private static readonly BUFFER_TIME_MS = 5 * 60 * 1000;

    constructor(private connectionRepository: ConnectionRepository) { }

    async getValidAccessToken(userId: string, platform: Platform): Promise<string | null> {
        const connection = await this.connectionRepository.findByUserAndProvider(userId, platform);

        if (!connection) {
            logger.debug({ userId, platform }, 'No connection found');
            return null;
        }

        if (platform === 'tiktok') {
            return connection.accessToken;
        }

        if (this.isTokenValid(connection.expiryDate)) {
            return connection.accessToken;
        }

        return await this.refreshToken(connection, platform as OAuthPlatform);
    }

    async forceTokenRefresh(userId: string, platform: Platform): Promise<string | null> {
        const connection = await this.connectionRepository.findByUserAndProvider(userId, platform);

        if (!connection) {
            logger.error({ userId, platform }, 'Cannot force refresh: No connection found');
            return null;
        }

        if (platform === 'tiktok') {
            logger.warn({ userId, platform }, 'Cannot force refresh: TikTok does not support token refresh');
            return null;
        }

        if (!connection.refreshToken) {
            logger.error(
                { userId, platform, connectionId: connection.id },
                'Cannot force refresh: No refresh token available. User must reconnect the platform.'
            );
            return null;
        }

        logger.debug({ userId, platform, connectionId: connection.id }, 'Forcing token refresh');

        return await this.refreshToken(connection, platform as OAuthPlatform);
    }

    private isTokenValid(expiryDate: Date | null): boolean {
        if (!expiryDate) return false;

        const timeUntilExpiry = expiryDate.getTime() - Date.now();
        return timeUntilExpiry > TokenRefreshService.BUFFER_TIME_MS;
    }

    private async refreshToken(connection: Connection, platform: OAuthPlatform): Promise<string> {
        if (!connection.refreshToken) {
            logger.warn({ platform, connectionId: connection.id }, 'No refresh token available');
            return connection.accessToken;
        }

        try {
            logger.debug({ platform, connectionId: connection.id }, 'Refreshing access token');

            const platformService = PLATFORM_SERVICES[platform];
            const newTokens = await platformService.refreshAccessToken(connection.refreshToken);

            connection.accessToken = newTokens.access_token;
            if (newTokens.refresh_token) {
                connection.refreshToken = newTokens.refresh_token;
            }
            connection.expiryDate = calculateTokenExpiry(newTokens.expires_in);

            await connection.save();

            logger.info({ platform, connectionId: connection.id }, 'Token refreshed successfully');

            return connection.accessToken;
        } catch (error) {
            logger.error(
                { err: error, platform, connectionId: connection.id },
                'Failed to refresh token'
            );
            return connection.accessToken;
        }
    }
}
