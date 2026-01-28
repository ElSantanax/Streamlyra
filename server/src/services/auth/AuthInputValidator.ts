/**
 * Validador de Entrada de Autenticación
 * Responsabilidad: Validar y sanitizar entradas de autenticación
 */

import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export class AuthInputValidator {
    /**
     * Valida y limpia un username de TikTok
     * @param username - Username a validar (puede incluir @)
     * @returns Username limpio y validado
     * @throws AppError si el username es inválido
     */
    validateTikTokUsername(username: string): string {
        // Validar que no sea null/undefined/vacío
        if (!username || typeof username !== 'string') {
            logger.warn({ username }, 'TikTok username validation failed: empty or invalid type');
            throw new AppError('TikTok username is required', 400);
        }

        // Limpiar username (remover @ al inicio)
        const cleanUsername = username.trim().replace(/^@+/, '');

        // Validar que después de limpiar no esté vacío
        if (cleanUsername.length === 0) {
            logger.warn({ username, cleanUsername }, 'TikTok username validation failed: empty after cleaning');
            throw new AppError('TikTok username cannot be empty', 400);
        }

        // Validar longitud (TikTok permite 2-24 caracteres)
        if (cleanUsername.length < 2 || cleanUsername.length > 24) {
            logger.warn(
                { username, cleanUsername, length: cleanUsername.length },
                'TikTok username validation failed: invalid length'
            );
            throw new AppError('TikTok username must be between 2 and 24 characters', 400);
        }

        // Validar caracteres permitidos (alfanuméricos, guiones bajos y puntos)
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

    /**
     * Valida que los tokens OAuth no estén vacíos
     * @param tokens - Tokens a validar
     * @param platform - Plataforma de origen
     * @throws AppError si los tokens son inválidos
     */
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
            // No lanzar error, solo advertir (algunos providers pueden no enviar expires_in)
        }

        logger.debug({ platform }, 'OAuth tokens validated successfully');
    }

    /**
     * Valida que el código de autorización OAuth no esté vacío
     * @param code - Código de autorización
     * @param platform - Plataforma de origen
     * @throws AppError si el código es inválido
     */
    validateAuthorizationCode(code: string, platform: string): void {
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            logger.warn({ platform }, 'Authorization code validation failed: empty or invalid');
            throw new AppError('Authorization code is required', 400);
        }

        logger.debug({ platform }, 'Authorization code validated successfully');
    }
}
