import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';
import { logger } from '../../utils/logger';
import { calculateTokenExpiry } from '../../utils/tokenUtils';
import { PlatformServiceFactory } from '../platforms/PlatformServiceFactory';

/** Servicio de renovación de tokens OAuth con verificación de expiración */
export class TokenRefreshService {
    private static readonly BUFFER_TIME_MS = 5 * 60 * 1000;

    /** * Promise Cache (Thundering Herd): Evita múltiples llamadas simultáneas a la API OAuth 
     * para el mismo usuario/plataforma haciendo que las peticiones esperen a la misma Promise.
     */
    private refreshPromises: Map<string, Promise<string | null>> = new Map();

    constructor(private connectionRepository: IConnectionRepository) { }

    async getValidAccessToken(userId: string, platform: Platform): Promise<string | null> {
        const connection = await this.connectionRepository.findByUserAndProvider(userId, platform);

        if (!connection) {
            logger.debug({ userId, platform }, 'No connection found');
            return null;
        }

        if (platform === 'tiktok' || this.isTokenValid(connection.expiryDate)) {
            return connection.accessToken;
        }

        const cacheKey = `${userId}:${platform}`;
        const existingRefresh = this.refreshPromises.get(cacheKey);

        if (existingRefresh) {
            logger.debug({ userId, platform }, 'Reusing existing token refresh promise');
            return existingRefresh;
        }

        const refreshPromise = this.refreshToken(connection, platform)
            .finally(() => {
                this.refreshPromises.delete(cacheKey);
            });

        this.refreshPromises.set(cacheKey, refreshPromise);
        return refreshPromise;
    }

    async forceTokenRefresh(userId: string, platform: Platform): Promise<string | null> {
        const connection = await this.connectionRepository.findByUserAndProvider(userId, platform);

        if (!connection || platform === 'tiktok' || !connection.refreshToken) {
            logger.error({ userId, platform }, 'Force refresh failed: Connection invalid or unsupported');
            return null;
        }

        const cacheKey = `${userId}:${platform}`;
        const existingRefresh = this.refreshPromises.get(cacheKey);

        if (existingRefresh) return existingRefresh;

        const refreshPromise = this.refreshToken(connection, platform)
            .finally(() => this.refreshPromises.delete(cacheKey));

        this.refreshPromises.set(cacheKey, refreshPromise);
        return refreshPromise;
    }

    private isTokenValid(expiryDate: Date | null): boolean {
        if (!expiryDate) return false;
        return (expiryDate.getTime() - Date.now()) > TokenRefreshService.BUFFER_TIME_MS;
    }

    private async refreshToken(connection: Connection, platform: Platform): Promise<string | null> {
        if (!connection.refreshToken) {
            logger.warn({ platform, connectionId: connection.id }, 'No refresh token available');
            return null;
        }

        try {
            logger.debug({ platform, connectionId: connection.id }, 'Refreshing access token');

            const platformService = PlatformServiceFactory.getService(platform);
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
            const errorMessage = error instanceof Error ? error.message : '';
            const errorString = String(error);

            // Detectar si el refresh token ha expirado o ha sido revocado (invalid_grant)
            if (
                errorMessage.includes('invalid_grant') ||
                errorMessage.includes('expirado') ||
                errorMessage.includes('invalid_token') ||
                errorString.includes('400') || 
                errorString.includes('401')
            ) {
                logger.error({ platform, connectionId: connection.id }, 'Refresh token revoked, clearing connection');
                
                try {
                    connection.accessToken = '';
                    connection.refreshToken = '';
                    connection.expiryDate = null;
                    await connection.save();
                } catch (saveError) {
                    logger.error({ err: saveError }, 'Failed to clear invalid tokens');
                }
            }

            logger.error({ err: error, platform }, 'Failed to refresh token');
            return null;
        }
    }
}