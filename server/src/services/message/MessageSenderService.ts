import { ConnectionService } from '../connection/ConnectionService';
import { TwitchService } from '../platforms/TwitchService';
import { YouTubeService } from '../platforms/YouTubeService';
import { KickService } from '../platforms/KickService';
import { Connection } from '../../models/Connection.model';
import { logger } from '../../utils/logger';
import { SendMessageRequest, SendMessageResponse, PlatformResult } from '../../types/message.types';
import { Platform } from '../../constants/platforms';
import axios from 'axios';

/**
 * MessageSenderService
 * 
 * Responsabilidad: Coordinar el envío de mensajes a múltiples plataformas simultáneamente
 * 
 * Funcionalidades:
 * - Procesar solicitudes de envío de mensajes
 * - Enviar mensajes a múltiples plataformas en paralelo
 * - Agregar resultados de todas las plataformas
 * - Manejar errores de forma independiente por plataforma
 */
export class MessageSenderService {
    constructor(
        private connectionService: ConnectionService,
        private twitchService: TwitchService,
        private youtubeService: YouTubeService,
        private kickService: KickService
    ) { }

    /**
     * Envía un mensaje a múltiples plataformas simultáneamente
     * 
     * @param request - Solicitud con userId, mensaje y plataformas
     * @returns Response con resultados agregados de todas las plataformas
     * 
     * Validates: Requirements 4.3, 10.1, 10.3
     */
    async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
        const { userId, message, platforms } = request;

        logger.info(
            { userId, platforms, messageLength: message.length },
            'Starting message send to multiple platforms'
        );

        // Filtrar TikTok (defensive programming - Requirement 8.3)
        const validPlatforms = platforms.filter(p => p !== 'tiktok');

        // Enviar a todas las plataformas concurrentemente (Requirement 10.1)
        const sendPromises = validPlatforms.map(platform =>
            this.sendToPlatform(userId, message, platform)
        );

        const results = await Promise.all(sendPromises);

        // Determinar éxito general (al menos una plataforma exitosa)
        const success = results.some(r => r.success);

        logger.info(
            {
                userId,
                success,
                successCount: results.filter(r => r.success).length,
                totalCount: results.length
            },
            'Message send completed'
        );

        return {
            success,
            results,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Envía un mensaje a una plataforma específica
     * 
     * @param userId - ID del usuario
     * @param message - Mensaje a enviar
     * @param platform - Plataforma destino
     * @returns Resultado del envío para esa plataforma
     * 
     * Validates: Requirements 10.2 (errores no detienen otras plataformas)
     */
    private async sendToPlatform(
        userId: string,
        message: string,
        platform: Platform
    ): Promise<PlatformResult> {
        try {
            switch (platform) {
                case 'twitch':
                    return await this.sendToTwitch(userId, message);
                case 'youtube':
                    return await this.sendToYouTube(userId, message);
                case 'kick':
                    return await this.sendToKick(userId, message);
                default:
                    logger.warn({ platform, userId }, 'Unsupported platform');
                    return {
                        platform,
                        success: false,
                        error: 'Plataforma no soportada',
                        errorCode: 'UNSUPPORTED_PLATFORM'
                    };
            }
        } catch (error) {
            logger.error({ err: error, platform, userId }, 'Unexpected error sending to platform');
            return {
                platform,
                success: false,
                error: 'Error inesperado',
                errorCode: 'UNEXPECTED_ERROR'
            };
        }
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
        // This catches patterns like "Invalid token: <token>", "token: <token>", etc.
        const tokenPhrasePattern = /(token|key|secret|credential|authorization|bearer)[\s:]+([^\s]{10,}|.{20,})/gi;
        let sanitized = errorMessage.replace(tokenPhrasePattern, '$1: [REDACTED]');

        // Pattern 2: Match standalone long alphanumeric strings that look like tokens
        // Must contain at least some alphanumeric characters (not just spaces/special chars)
        const standaloneTokenPattern = /\b[A-Za-z0-9_\-.]{20,}\b/g;
        sanitized = sanitized.replace(standaloneTokenPattern, '[REDACTED]');

        return sanitized;
    }

    /**
     * Envía un mensaje a Twitch
     * 
     * @param userId - ID del usuario
     * @param message - Mensaje a enviar
     * @returns Resultado del envío
     * 
     * Validates: Requirements 5.1, 5.3, 5.4, 5.5
     */
    private async sendToTwitch(userId: string, message: string): Promise<PlatformResult> {
        try {
            // Obtener conexión de Twitch del usuario (Requirement 5.5)
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'twitch' }
            });

            // Validar que la conexión existe (Requirement 5.5)
            if (!connection) {
                logger.debug({ userId, platform: 'twitch' }, 'Connection not found');
                return {
                    platform: 'twitch',
                    success: false,
                    error: 'No conectado',
                    errorCode: 'NOT_CONNECTED'
                };
            }

            // Obtener token válido usando ConnectionService (Requirement 5.3)
            const accessToken = await this.connectionService.getValidAccessToken(userId, 'twitch');
            if (!accessToken) {
                logger.warn({ userId, platform: 'twitch' }, 'Failed to get valid access token');
                return {
                    platform: 'twitch',
                    success: false,
                    error: 'Token inválido',
                    errorCode: 'INVALID_TOKEN'
                };
            }

            try {
                // Primer intento: Llamar a TwitchService.sendChatMessage (Requirement 5.1)
                await this.twitchService.sendChatMessage(
                    accessToken,
                    connection.providerId, // broadcaster_id
                    connection.providerId, // sender_id (same as broadcaster)
                    message
                );

                logger.info({ userId, platform: 'twitch' }, 'Message sent successfully');

                // Retornar PlatformResult con éxito (Requirement 5.3)
                return {
                    platform: 'twitch',
                    success: true
                };

            } catch (firstAttemptError: unknown) {
                // Verificar si es un error 401 (token rechazado)
                if (axios.isAxiosError(firstAttemptError) && firstAttemptError.response?.status === 401) {
                    logger.warn(
                        { userId, platform: 'twitch' },
                        'Token rejected by Twitch (401), attempting to refresh and retry'
                    );

                    // Intentar renovar el token forzadamente
                    const newAccessToken = await this.connectionService.forceTokenRefresh(userId, 'twitch');

                    if (!newAccessToken) {
                        logger.error(
                            { userId, platform: 'twitch' },
                            'Failed to refresh token after 401 error'
                        );
                        return {
                            platform: 'twitch',
                            success: false,
                            error: 'Token inválido. Por favor reconecta tu cuenta de Twitch.',
                            errorCode: 'TOKEN_REFRESH_FAILED'
                        };
                    }

                    // Segundo intento: Reintentar con el nuevo token
                    try {
                        await this.twitchService.sendChatMessage(
                            newAccessToken,
                            connection.providerId,
                            connection.providerId,
                            message
                        );

                        logger.info(
                            { userId, platform: 'twitch' },
                            'Message sent successfully after token refresh and retry'
                        );

                        return {
                            platform: 'twitch',
                            success: true
                        };

                    } catch (retryError: unknown) {
                        // El reintento también falló
                        const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Error al enviar';
                        const retryErrorCode = (retryError as { code?: string }).code || 'TWITCH_RETRY_ERROR';

                        logger.error(
                            { err: retryError, userId, platform: 'twitch' },
                            'Retry failed after token refresh'
                        );

                        return {
                            platform: 'twitch',
                            success: false,
                            error: this.sanitizeErrorMessage(retryErrorMessage),
                            errorCode: retryErrorCode
                        };
                    }
                }

                // No es un error 401, propagar el error original
                throw firstAttemptError;
            }

        } catch (error: unknown) {
            // Retornar PlatformResult con error (Requirement 5.4)
            const rawErrorMessage = error instanceof Error ? error.message : 'Error al enviar';
            const errorCode = (error as { code?: string }).code || 'TWITCH_ERROR';

            // Sanitize error message to prevent credential leakage
            const errorMessage = this.sanitizeErrorMessage(rawErrorMessage);

            logger.error({ err: error, userId, platform: 'twitch' }, 'Failed to send to Twitch');
            return {
                platform: 'twitch',
                success: false,
                error: errorMessage,
                errorCode: errorCode
            };
        }
    }

    /**
     * Envía un mensaje a YouTube
     * 
     * @param userId - ID del usuario
     * @param message - Mensaje a enviar
     * @returns Resultado del envío
     * 
     * Validates: Requirements 6.1, 6.3, 6.4, 6.5
     */
    private async sendToYouTube(userId: string, message: string): Promise<PlatformResult> {
        try {
            // Obtener conexión de YouTube del usuario (Requirement 6.5)
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'youtube' }
            });

            // Validar que la conexión existe (Requirement 6.5)
            if (!connection) {
                logger.debug({ userId, platform: 'youtube' }, 'Connection not found');
                return {
                    platform: 'youtube',
                    success: false,
                    error: 'No conectado',
                    errorCode: 'NOT_CONNECTED'
                };
            }

            // Obtener token válido usando ConnectionService (Requirement 6.1)
            const accessToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
            if (!accessToken) {
                logger.warn({ userId, platform: 'youtube' }, 'Failed to get valid access token');
                return {
                    platform: 'youtube',
                    success: false,
                    error: 'Token inválido',
                    errorCode: 'INVALID_TOKEN'
                };
            }

            try {
                // Obtener liveChatId activo (Requirement 6.1)
                const liveChatId = await this.youtubeService.getActiveLiveChatId(accessToken);

                // Validar que existe un broadcast en vivo (Requirement 6.5)
                if (!liveChatId) {
                    logger.debug({ userId, platform: 'youtube' }, 'No active live broadcast found');
                    return {
                        platform: 'youtube',
                        success: false,
                        error: 'No hay stream en vivo',
                        errorCode: 'NO_LIVE_BROADCAST'
                    };
                }

                // Primer intento: Llamar a YouTubeService.sendChatMessage (Requirement 6.1)
                await this.youtubeService.sendChatMessage(accessToken, liveChatId, message);

                logger.info({ userId, platform: 'youtube' }, 'Message sent successfully');

                // Retornar PlatformResult con éxito (Requirement 6.3)
                return {
                    platform: 'youtube',
                    success: true
                };

            } catch (firstAttemptError: unknown) {
                // Verificar si es un error 401 (token rechazado)
                if (axios.isAxiosError(firstAttemptError) && firstAttemptError.response?.status === 401) {
                    logger.warn(
                        { userId, platform: 'youtube' },
                        'Token rejected by YouTube (401), attempting to refresh and retry'
                    );

                    // Intentar renovar el token forzadamente
                    const newAccessToken = await this.connectionService.forceTokenRefresh(userId, 'youtube');

                    if (!newAccessToken) {
                        logger.error(
                            { userId, platform: 'youtube' },
                            'Failed to refresh token after 401 error'
                        );
                        return {
                            platform: 'youtube',
                            success: false,
                            error: 'Token inválido. Por favor reconecta tu cuenta de YouTube.',
                            errorCode: 'TOKEN_REFRESH_FAILED'
                        };
                    }

                    // Segundo intento: Obtener liveChatId y reintentar con el nuevo token
                    try {
                        const liveChatId = await this.youtubeService.getActiveLiveChatId(newAccessToken);

                        if (!liveChatId) {
                            return {
                                platform: 'youtube',
                                success: false,
                                error: 'No hay stream en vivo',
                                errorCode: 'NO_LIVE_BROADCAST'
                            };
                        }

                        await this.youtubeService.sendChatMessage(newAccessToken, liveChatId, message);

                        logger.info(
                            { userId, platform: 'youtube' },
                            'Message sent successfully after token refresh and retry'
                        );

                        return {
                            platform: 'youtube',
                            success: true
                        };

                    } catch (retryError: unknown) {
                        // El reintento también falló
                        const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Error al enviar';
                        const retryErrorCode = (retryError as { code?: string }).code || 'YOUTUBE_RETRY_ERROR';

                        logger.error(
                            { err: retryError, userId, platform: 'youtube' },
                            'Retry failed after token refresh'
                        );

                        return {
                            platform: 'youtube',
                            success: false,
                            error: this.sanitizeErrorMessage(retryErrorMessage),
                            errorCode: retryErrorCode
                        };
                    }
                }

                // No es un error 401, propagar el error original
                throw firstAttemptError;
            }

        } catch (error: unknown) {
            // Retornar PlatformResult con error (Requirement 6.4)
            const rawErrorMessage = error instanceof Error ? error.message : 'Error al enviar';
            const errorCode = (error as { code?: string }).code || 'YOUTUBE_ERROR';

            // Sanitize error message to prevent credential leakage
            const errorMessage = this.sanitizeErrorMessage(rawErrorMessage);

            logger.error({ err: error, userId, platform: 'youtube' }, 'Failed to send to YouTube');
            return {
                platform: 'youtube',
                success: false,
                error: errorMessage,
                errorCode: errorCode
            };
        }
    }

    /**
     * Envía un mensaje a Kick
     * 
     * @param userId - ID del usuario
     * @param message - Mensaje a enviar
     * @returns Resultado del envío
     * 
     * Validates: Requirements 7.1, 7.3, 7.4, 7.5
     */
    private async sendToKick(userId: string, message: string): Promise<PlatformResult> {
        try {
            // Obtener conexión de Kick del usuario (Requirement 7.5)
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'kick' }
            });

            // Validar que la conexión existe (Requirement 7.5)
            if (!connection) {
                logger.debug({ userId, platform: 'kick' }, 'Connection not found');
                return {
                    platform: 'kick',
                    success: false,
                    error: 'No conectado',
                    errorCode: 'NOT_CONNECTED'
                };
            }

            // Obtener token válido usando ConnectionService (Requirement 7.3)
            const accessToken = await this.connectionService.getValidAccessToken(userId, 'kick');
            if (!accessToken) {
                logger.warn({ userId, platform: 'kick' }, 'Failed to get valid access token');
                return {
                    platform: 'kick',
                    success: false,
                    error: 'Token inválido',
                    errorCode: 'INVALID_TOKEN'
                };
            }

            // Obtener channel ID (stored in providerId)
            const channelId = connection.providerId;

            try {
                // Primer intento: Llamar a KickService.sendChatMessage (Requirement 7.1)
                await this.kickService.sendChatMessage(accessToken, channelId, message);

                logger.info({ userId, platform: 'kick' }, 'Message sent successfully');

                // Retornar PlatformResult con éxito (Requirement 7.3)
                return {
                    platform: 'kick',
                    success: true
                };

            } catch (firstAttemptError: unknown) {
                // Verificar si es un error 401 (token rechazado)
                if (axios.isAxiosError(firstAttemptError) && firstAttemptError.response?.status === 401) {
                    logger.warn(
                        { userId, platform: 'kick' },
                        'Token rejected by Kick (401), attempting to refresh and retry'
                    );

                    // Intentar renovar el token forzadamente
                    const newAccessToken = await this.connectionService.forceTokenRefresh(userId, 'kick');

                    if (!newAccessToken) {
                        logger.error(
                            { userId, platform: 'kick' },
                            'Failed to refresh token after 401 error'
                        );
                        return {
                            platform: 'kick',
                            success: false,
                            error: 'Token inválido. Por favor reconecta tu cuenta de Kick.',
                            errorCode: 'TOKEN_REFRESH_FAILED'
                        };
                    }

                    // Segundo intento: Reintentar con el nuevo token
                    try {
                        await this.kickService.sendChatMessage(newAccessToken, channelId, message);

                        logger.info(
                            { userId, platform: 'kick' },
                            'Message sent successfully after token refresh and retry'
                        );

                        return {
                            platform: 'kick',
                            success: true
                        };

                    } catch (retryError: unknown) {
                        // El reintento también falló
                        const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Error al enviar';
                        const retryErrorCode = (retryError as { code?: string }).code || 'KICK_RETRY_ERROR';

                        logger.error(
                            { err: retryError, userId, platform: 'kick' },
                            'Retry failed after token refresh'
                        );

                        return {
                            platform: 'kick',
                            success: false,
                            error: this.sanitizeErrorMessage(retryErrorMessage),
                            errorCode: retryErrorCode
                        };
                    }
                }

                // No es un error 401, propagar el error original
                throw firstAttemptError;
            }

        } catch (error: unknown) {
            // Retornar PlatformResult con error (Requirement 7.4)
            const rawErrorMessage = error instanceof Error ? error.message : 'Error al enviar';
            const errorCode = (error as { code?: string }).code || 'KICK_ERROR';

            // Sanitize error message to prevent credential leakage
            const errorMessage = this.sanitizeErrorMessage(rawErrorMessage);

            logger.error({ err: error, userId, platform: 'kick' }, 'Failed to send to Kick');
            return {
                platform: 'kick',
                success: false,
                error: errorMessage,
                errorCode: errorCode
            };
        }
    }
}
