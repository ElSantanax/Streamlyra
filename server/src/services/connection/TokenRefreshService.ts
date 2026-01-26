/**
 * Servicio de renovación de tokens
 * Responsable de renovar tokens OAuth cuando están próximos a expirar
 */

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
    private static readonly BUFFER_TIME_MS = 5 * 60 * 1000; // 5 minutos

    constructor(private connectionRepository: ConnectionRepository) { }

    /**
     * Obtiene un token de acceso válido, renovándolo si es necesario
     */
    async getValidAccessToken(userId: string, platform: Platform): Promise<string | null> {
        const connection = await this.connectionRepository.findByUserAndProvider(userId, platform);

        if (!connection) {
            logger.debug({ userId, platform }, 'No connection found');
            return null;
        }

        // TikTok no tiene renovación de tokens
        if (platform === 'tiktok') {
            return connection.accessToken;
        }

        // Verificar si token está próximo a expirar
        if (this.isTokenValid(connection.expiryDate)) {
            return connection.accessToken;
        }

        // Intentar renovar token
        return await this.refreshToken(connection, platform as OAuthPlatform);
    }

    /**
     * Verifica si un token es válido (no está próximo a expirar)
     */
    private isTokenValid(expiryDate: Date | null): boolean {
        if (!expiryDate) return false;

        const timeUntilExpiry = expiryDate.getTime() - Date.now();
        return timeUntilExpiry > TokenRefreshService.BUFFER_TIME_MS;
    }

    /**
     * Renueva un token de acceso
     */
    private async refreshToken(connection: Connection, platform: OAuthPlatform): Promise<string> {
        if (!connection.refreshToken) {
            logger.warn({ platform, connectionId: connection.id }, 'No refresh token available');
            return connection.accessToken;
        }

        try {
            logger.debug({ platform, connectionId: connection.id }, 'Refreshing access token');

            const platformService = PLATFORM_SERVICES[platform];
            const newTokens = await platformService.refreshAccessToken(connection.refreshToken);

            // Actualizar conexión con nuevos tokens
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
            // Devolver token actual como fallback
            return connection.accessToken;
        }
    }


}
