/** Helper para envío de mensajes con validación de tokens y retry automático en caso de 401 */

import { ConnectionService } from '../connection/ConnectionService';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';
import { PlatformResult } from '../../types/message.types';
import { logger } from '../../utils/logger';
import axios from 'axios';

export class PlatformSendHelper {
    constructor(private connectionService: ConnectionService) { }

    async sendWithRetry(
        platform: Platform,
        userId: string,
        sendFn: (token: string, connection: Connection) => Promise<void>
    ): Promise<PlatformResult> {
        try {
            const connection = await this.validateConnection(userId, platform);
            if (!connection) {
                return {
                    platform,
                    success: false,
                    error: 'No conectado',
                    errorCode: 'NOT_CONNECTED'
                };
            }

            const accessToken = await this.connectionService.getValidAccessToken(userId, platform);
            if (!accessToken) {
                logger.warn({ userId, platform }, 'Failed to get valid access token');
                return {
                    platform,
                    success: false,
                    error: 'Token inválido',
                    errorCode: 'INVALID_TOKEN'
                };
            }

            try {
                await sendFn(accessToken, connection);
                logger.info({ userId, platform }, 'Message sent successfully');
                return { platform, success: true };

            } catch (firstAttemptError: unknown) {
                if (axios.isAxiosError(firstAttemptError) && firstAttemptError.response?.status === 401) {
                    return await this.retryWithRefreshedToken(
                        platform,
                        userId,
                        connection,
                        sendFn
                    );
                }
                throw firstAttemptError;
            }

        } catch (error: unknown) {
            return this.handleError(error, platform);
        }
    }

    private async validateConnection(
        userId: string,
        platform: Platform
    ): Promise<Connection | null> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: platform }
        });

        if (!connection) {
            logger.debug({ userId, platform }, 'Connection not found');
        }

        return connection;
    }

    private async retryWithRefreshedToken(
        platform: Platform,
        userId: string,
        connection: Connection,
        sendFn: (token: string, connection: Connection) => Promise<void>
    ): Promise<PlatformResult> {
        logger.warn(
            { userId, platform },
            'Token rejected by platform (401), attempting to refresh and retry'
        );

        const newAccessToken = await this.connectionService.forceTokenRefresh(userId, platform);

        if (!newAccessToken) {
            logger.error(
                { userId, platform },
                'Failed to refresh token after 401 error'
            );
            return {
                platform,
                success: false,
                error: `Token inválido. Por favor reconecta tu cuenta de ${this.getPlatformName(platform)}.`,
                errorCode: 'TOKEN_REFRESH_FAILED'
            };
        }

        try {
            await sendFn(newAccessToken, connection);

            logger.info(
                { userId, platform },
                'Message sent successfully after token refresh and retry'
            );

            return {
                platform,
                success: true
            };

        } catch (retryError: unknown) {
            const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Error al enviar';
            const retryErrorCode = (retryError as { code?: string }).code || `${platform.toUpperCase()}_RETRY_ERROR`;

            logger.error(
                { err: retryError, userId, platform },
                'Retry failed after token refresh'
            );

            return {
                platform,
                success: false,
                error: this.sanitizeErrorMessage(retryErrorMessage),
                errorCode: retryErrorCode
            };
        }
    }

    private handleError(error: unknown, platform: Platform): PlatformResult {
        const rawErrorMessage = error instanceof Error ? error.message : 'Error al enviar';
        const errorCode = (error as { code?: string }).code || `${platform.toUpperCase()}_ERROR`;
        const errorMessage = this.sanitizeErrorMessage(rawErrorMessage);

        logger.error({ err: error, platform }, 'Failed to send to platform');

        return {
            platform,
            success: false,
            error: errorMessage,
            errorCode: errorCode
        };
    }

    private sanitizeErrorMessage(errorMessage: string): string {
        const tokenPhrasePattern = /(token|key|secret|credential|authorization|bearer)[\s:]+([^\s]{10,}|.{20,})/gi;
        let sanitized = errorMessage.replace(tokenPhrasePattern, '$1: [REDACTED]');

        const standaloneTokenPattern = /\b[A-Za-z0-9_\-.]{20,}\b/g;
        sanitized = sanitized.replace(standaloneTokenPattern, '[REDACTED]');

        return sanitized;
    }

    private getPlatformName(platform: Platform): string {
        const names: Record<Platform, string> = {
            twitch: 'Twitch',
            youtube: 'YouTube',
            kick: 'Kick',
            tiktok: 'TikTok'
        };
        return names[platform] || platform;
    }
}
