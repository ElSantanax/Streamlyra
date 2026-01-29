/** Servicio de envío de mensajes a múltiples plataformas con manejo de errores independiente */

import { ConnectionService } from '../connection/ConnectionService';
import { TwitchService } from '../platforms/TwitchService';
import { YouTubeService } from '../platforms/YouTubeService';
import { KickService } from '../platforms/KickService';
import { PlatformSendHelper } from './PlatformSendHelper';
import { logger } from '../../utils/logger';
import { SendMessageRequest, SendMessageResponse, PlatformResult } from '../../types/message.types';
import { Platform } from '../../constants/platforms';

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

    async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
        const { userId, message, platforms } = request;

        logger.info(
            { userId, platforms, messageLength: message.length },
            'Starting message send to multiple platforms'
        );

        // Si el array de plataformas está vacío, enviar a todas las plataformas conectadas
        let targetPlatforms: string[];
        
        if (platforms.length === 0) {
            logger.info({ userId }, 'Empty platforms array - fetching all connected platforms');
            const connections = await this.connectionService.getAllConnections(userId);
            targetPlatforms = connections
                .map(conn => conn.provider)
                .filter(p => p !== 'tiktok');
            
            logger.info(
                { userId, connectedPlatforms: targetPlatforms },
                'Sending to all connected platforms'
            );
        } else {
            targetPlatforms = platforms.filter(p => p !== 'tiktok');
        }

        const sendPromises = targetPlatforms.map(platform =>
            this.sendToPlatform(userId, message, platform as Platform)
        );

        const results = await Promise.all(sendPromises);

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

    private async sendToTwitch(userId: string, message: string): Promise<PlatformResult> {
        return this.helper.sendWithRetry(
            'twitch',
            userId,
            async (accessToken, connection) => {
                await this.twitchService.sendChatMessage(
                    accessToken,
                    connection.providerId,
                    connection.providerId,
                    message
                );
            }
        );
    }

    private async sendToYouTube(userId: string, message: string): Promise<PlatformResult> {
        return this.helper.sendWithRetry(
            'youtube',
            userId,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            async (accessToken, _connection) => {
                const liveChatId = await this.youtubeService.getActiveLiveChatId(accessToken);

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

    private async sendToKick(userId: string, message: string): Promise<PlatformResult> {
        return this.helper.sendWithRetry(
            'kick',
            userId,
            async (accessToken, connection) => {
                await this.kickService.sendChatMessage(
                    accessToken,
                    connection.providerId,
                    message
                );
            }
        );
    }
}
