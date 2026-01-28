import { ConnectionService } from '../connection/ConnectionService';
import { Connection } from '../../models/Connection.model';
import { Platform } from '../../constants/platforms';
import { PlatformResult } from '../../types/message.types';
import { logger } from '../../utils/logger';
import axios from 'axios';

/**
 * PlatformSendHelper
 * 
 * Responsabilidad: Manejar la lógica común de envío de mensajes a plataformas
 * - Validación de conexiones
 * - Validación de tokens
 * - Retry automático con refresh de token en caso de 401
 * - Sanitización de errores
 * 
 * Validates: Requirements 11.3, 11.4
 */
export class PlatformSendHelper {
    constructor(private connectionService: ConnectionService) {}

    /**
     * Envía mensaje con retry automático en caso de 401
     * 
     * @param platform - Plataforma destino
     * @param userId - ID del usuario
     * @param sendFn - Función que ejecuta el envío con el token
     * @returns Resultado del envío
     */
    async sendWithRetry(
        platform: Platform,
        userId: string,
        sendFn: (token: string, connection: Connection) => Promise<void>
    ): Promise<PlatformResult> {
        try {
            // 1. Validar conexión
            const connection = await this.validateConnection(userId, platform);
            if (!connection) {
                return {
                    platform,
                    success: false,
                    error: 'No conectado',
                    errorCode: 'NOT_CONNECTED'
                };
            }

            // 2. Obtener token válido
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

            // 3. Primer intento de envío
            try {
                await sendFn(accessToken, connection);
                logger.info({ userId, platform }, 'Message sent successfully');
                return { platform, success: true };

            } catch (firstAttemptError: unknown) {
                // 4. Manejo de error 401 con retry
                if (axios.isAxiosError(firstAttemptError) && firstAttemptError.response?.status === 401) {
                    return await this.retryWithRefreshedToken(
                        platform,
                        userId,
                        connection,
                        sendFn
                    );
                }
                // Si no es 401, propagar el error
                throw firstAttemptError;
            }

        } catch (error: unknown) {
            // 5. Manejo de errores generales
            return this.handleError(error, platform);
        }
    }

    /**
     * Valida que el usuario tenga conexión con la plataforma
     */
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

    /**
     * Reintenta el envío después de refrescar el token
     */
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

        // Intentar renovar el token forzadamente
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

        // Segundo intento con el nuevo token
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
            // El reintento también falló
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

    /**
     * Maneja errores generales del envío
     */
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

    /**
     * Sanitiza mensajes de error para prevenir exposición de credenciales
     * 
     * @param errorMessage - Mensaje de error original
     * @returns Mensaje de error sanitizado
     * 
     * Validates: Requirements 11.4 (Credentials never exposed to client)
     */
    private sanitizeErrorMessage(errorMessage: string): string {
        // Pattern 1: Match common token-related phrases followed by the actual token
        const tokenPhrasePattern = /(token|key|secret|credential|authorization|bearer)[\s:]+([^\s]{10,}|.{20,})/gi;
        let sanitized = errorMessage.replace(tokenPhrasePattern, '$1: [REDACTED]');

        // Pattern 2: Match standalone long alphanumeric strings that look like tokens
        const standaloneTokenPattern = /\b[A-Za-z0-9_\-.]{20,}\b/g;
        sanitized = sanitized.replace(standaloneTokenPattern, '[REDACTED]');

        return sanitized;
    }

    /**
     * Obtiene el nombre legible de la plataforma
     */
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
