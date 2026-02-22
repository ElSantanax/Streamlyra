import { IConnectionRepository } from '../../repositories/interfaces/IConnectionRepository';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';
import { logger } from '../../utils/logger';
import { PlatformServiceFactory } from '../platforms/PlatformServiceFactory';

export class TokenRefreshService {
    private static readonly BUFFER_TIME_MS = 5 * 60 * 1000;
    private refreshPromises: Map<string, Promise<string | null>> = new Map();

    constructor(private connectionRepository: IConnectionRepository) { }

    async getValidAccessToken(userId: string, platform: Platform, existingConnection?: Connection): Promise<string | null> {
        const connection = existingConnection || await this.connectionRepository.findByUserAndProvider(userId, platform);

        if (!connection) {
            logger.debug({ userId, platform }, 'TokenRefreshService: No connection found');
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

    private isTransientError(error: unknown): boolean {
        if (!error || typeof error !== 'object') return false;

        const err = error as {
            response?: { status?: number };
            code?: string;
            message?: string
        };

        const status = err.response?.status;
        const code = err.code || err.message;

        const networkErrors = ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ERR_NETWORK'];
        if (networkErrors.some(errMsg => String(code).includes(errMsg))) return true;

        if (typeof status === 'number') {
            return (status >= 500 && status <= 599) || status === 429;
        }

        return false;
    }

    private async refreshToken(connection: Connection, platform: Platform): Promise<string | null> {
        if (!connection.refreshToken) {
            logger.warn({ platform, connectionId: connection.id }, 'No refresh token available');
            return null;
        }

        const MAX_RETRIES = 3;
        let lastError: unknown;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    logger.debug({ platform, connectionId: connection.id, attempt: attempt + 1 }, 'Retrying token refresh');
                } else {
                    logger.debug({ platform, connectionId: connection.id }, 'Refreshing access token');
                }

                const platformService = PlatformServiceFactory.getService(platform);
                const newTokens = await platformService.refreshAccessToken(connection.refreshToken);

                await this.connectionRepository.updateTokens(connection.id, newTokens);

                logger.info({ platform, connectionId: connection.id }, 'Token refreshed successfully');
                return newTokens.access_token;

            } catch (error) {
                lastError = error;

                if (!this.isTransientError(error)) {
                    logger.warn({ platform, connectionId: connection.id }, 'Permanent error during refresh, skipping retries');
                    break;
                }

                if (attempt < MAX_RETRIES - 1) {
                    const baseDelay = Math.pow(2, attempt) * 1000;
                    const jitter = Math.random() * 1000;
                    const delay = baseDelay + jitter;

                    logger.warn({ platform, attempt: attempt + 1, delay: Math.round(delay) }, 'Transient error during refresh, waiting for retry...');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        const errorMessage = lastError instanceof Error ? lastError.message : '';
        const errorString = String(lastError);

        if (
            errorMessage.includes('invalid_grant') ||
            errorMessage.includes('expirado') ||
            errorMessage.includes('invalid_token') ||
            errorString.includes('400') ||
            errorString.includes('401')
        ) {
            logger.error({ platform, connectionId: connection.id }, 'Refresh token revoked, clearing connection');

            try {
                await this.connectionRepository.clearTokens(connection.id);
            } catch (saveError) {
                logger.error({ err: saveError }, 'Failed to clear invalid tokens');
            }
        }

        logger.error({ err: lastError, platform }, 'Failed to refresh token after all attempts');
        return null;
    }
}