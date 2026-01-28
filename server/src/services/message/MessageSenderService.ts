import { ConnectionService } from '../connection/ConnectionService';
import { TwitchService } from '../platforms/TwitchService';
import { YouTubeService } from '../platforms/YouTubeService';
import { KickService } from '../platforms/KickService';
import { PlatformSendHelper } from './PlatformSendHelper';
import { logger } from '../../utils/logger';
import { SendMessageRequest, SendMessageResponse, PlatformResult } from '../../types/message.types';
import { Platform } from '../../constants/platforms';

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
    private helper: PlatformSendHelper;

    constructor(
        private connectionService: ConnectionService,
        private twitchService: TwitchService,
        private youtubeService: YouTubeService,
        private kickService: KickService
    ) {
        this.helper = new PlatformSendHelper(connectionService);
    }

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
     * Envía un mensaje a Twitch
     * 
     * @param userId - ID del usuario
     * @param message - Mensaje a enviar
     * @returns Resultado del envío
     * 
     * Validates: Requirements 5.1, 5.3, 5.4, 5.5
     */
    private async sendToTwitch(userId: string, message: string): Promise<PlatformResult> {
        return this.helper.sendWithRetry(
            'twitch',
            userId,
            async (accessToken, connection) => {
                await this.twitchService.sendChatMessage(
                    accessToken,
                    connection.providerId, // broadcaster_id
                    connection.providerId, // sender_id (same as broadcaster)
                    message
                );
            }
        );
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
        return this.helper.sendWithRetry(
            'youtube',
            userId,
            async (accessToken, _connection) => {
                // Obtener liveChatId activo (Requirement 6.1)
                const liveChatId = await this.youtubeService.getActiveLiveChatId(accessToken);

                // Validar que existe un broadcast en vivo (Requirement 6.5)
                if (!liveChatId) {
                    logger.debug({ userId, platform: 'youtube' }, 'No active live broadcast found');
                    throw Object.assign(
                        new Error('No hay stream en vivo'),
                        { code: 'NO_LIVE_BROADCAST' }
                    );
                }

                await this.youtubeService.sendChatMessage(accessToken, liveChatId, message);
            }
        );
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
        return this.helper.sendWithRetry(
            'kick',
            userId,
            async (accessToken, connection) => {
                await this.kickService.sendChatMessage(
                    accessToken,
                    connection.providerId, // channelId
                    message
                );
            }
        );
    }
}
