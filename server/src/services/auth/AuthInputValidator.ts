/** Validador de entrada de autenticación con sanitización y validación de datos */

import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class AuthInputValidator {
    validateTikTokUsername(username: string): string {
        if (!username || typeof username !== 'string') {
            logger.warn({ username }, 'TikTok username validation failed: empty or invalid type');
            throw new AppError('TikTok username is required', 400);
        }

        const cleanUsername = username.trim().replace(/^@+/, '');

        if (cleanUsername.length === 0) {
            logger.warn({ username, cleanUsername }, 'TikTok username validation failed: empty after cleaning');
            throw new AppError('TikTok username cannot be empty', 400);
        }

        if (cleanUsername.length < 2 || cleanUsername.length > 24) {
            logger.warn(
                { username, cleanUsername, length: cleanUsername.length },
                'TikTok username validation failed: invalid length'
            );
            throw new AppError('TikTok username must be between 2 and 24 characters', 400);
        }

        const validUsernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!validUsernameRegex.test(cleanUsername)) {
            logger.warn(
                { username, cleanUsername },
                'TikTok username validation failed: invalid characters'
            );
            throw new AppError('TikTok username can only contain letters, numbers, dots and underscores', 400);
        }

        logger.debug({ username, cleanUsername }, 'TikTok username validated successfully');
        return cleanUsername;
    }

    validateOAuthTokens(tokens: { access_token: string; expires_in: number }, platform: string): void {
        if (!tokens.access_token || tokens.access_token.trim().length === 0) {
            logger.error({ platform }, 'OAuth token validation failed: empty access_token');
            throw new AppError(`Invalid ${platform} authentication tokens`, 500);
        }

        if (typeof tokens.expires_in !== 'number' || tokens.expires_in <= 0) {
            logger.warn(
                { platform, expires_in: tokens.expires_in },
                'OAuth token validation warning: invalid expires_in'
            );
        }

        logger.debug({ platform }, 'OAuth tokens validated successfully');
    }

    validateAuthorizationCode(code: string, platform: string): void {
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            logger.warn({ platform }, 'Authorization code validation failed: empty or invalid');
            throw new AppError('Authorization code is required', 400);
        }

        logger.debug({ platform }, 'Authorization code validated successfully');
    }
}
