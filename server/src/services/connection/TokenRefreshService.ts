/** Servicio de renovación de tokens OAuth con verificación de expiración */

import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';
import { logger } from '../../utils/logger';
import { calculateTokenExpiry } from '../../utils/tokenUtils';
import { PlatformServiceFactory } from '../platforms/PlatformServiceFactory';

export class TokenRefreshService {
    private static readonly BUFFER_TIME_MS = 5 * 60 * 1000;

    /**
     * Promise Cache para evitar "Thundering Herd":
     * Múltiples requests simultáneos para el mismo token esperan a la misma Promise
     * en lugar de hacer múltiples llamadas HTTP a la API de OAuth.
     * Key format: "userId:platform"
     */
    private refreshPromises: Map<string, Promise<string | null>> = new Map();

    constructor(private connectionRepository: IConnectionRepository) { }

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

        // Usar Promise Cache para evitar múltiples refreshes simultáneos
        const cacheKey = `${userId}:${platform}`;
        const existingRefresh = this.refreshPromises.get(cacheKey);

        if (existingRefresh) {
            logger.debug({ userId, platform }, 'Reusing existing token refresh promise');
            return existingRefresh;
        }

        const refreshPromise = this.refreshToken(connection, platform)
            .finally(() => {
                // Limpiar el cache cuando termine (éxito o error)
                this.refreshPromises.delete(cacheKey);
            });

        this.refreshPromises.set(cacheKey, refreshPromise);
        return refreshPromise;
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

        // Usar Promise Cache también para force refresh
        const cacheKey = `${userId}:${platform}`;
        const existingRefresh = this.refreshPromises.get(cacheKey);

        if (existingRefresh) {
            logger.debug({ userId, platform }, 'Reusing existing forced token refresh promise');
            return existingRefresh;
        }

        const refreshPromise = this.refreshToken(connection, platform)
            .finally(() => {
                this.refreshPromises.delete(cacheKey);
            });

        this.refreshPromises.set(cacheKey, refreshPromise);
        return refreshPromise;
    }

    private isTokenValid(expiryDate: Date | null): boolean {
        if (!expiryDate) return false;

        const timeUntilExpiry = expiryDate.getTime() - Date.now();
        return timeUntilExpiry > TokenRefreshService.BUFFER_TIME_MS;
    }

    private async refreshToken(connection: Connection, platform: Platform): Promise<string | null> {
        if (!connection.refreshToken) {
            logger.warn({ platform, connectionId: connection.id }, 'No refresh token available');
            return null; // Si no hay refresh token y el access está expirado, no podemos hacer nada
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
            logger.error(
                { err: error, platform, connectionId: connection.id },
                'Failed to refresh token'
            );
            return null; // Es mejor devolver null que un token que sabemos que no funciona
        }
    }
}
