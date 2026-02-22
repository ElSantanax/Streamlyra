import { ConnectionService } from '../connection/ConnectionService';
import { TwitchService } from '../platforms/TwitchService';
import { YouTubeService } from '../platforms/YouTubeService';
import { KickService } from '../platforms/KickService';
import { PlatformSendHelper } from './PlatformSendHelper';
import { logger } from '../../utils/logger';
import { sentMessageCache } from '../../utils/SentMessageCache';
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

        logger.debug(
            { userId, platforms, messageLength: message.length },
            'Starting message send to multiple platforms'
        );

        sentMessageCache.markAsSent(userId, message);

        let targetPlatforms: string[];

        if (platforms.length === 0) {
            const connections = await this.connectionService.getAllConnections(userId);
            targetPlatforms = connections
                .map(conn => conn.provider)
                .filter(p => p !== 'tiktok');
        } else {
            targetPlatforms = platforms.filter(p => p !== 'tiktok');
        }

        const sendPromises = targetPlatforms.map(platform =>
            this.sendToPlatform(userId, message, platform as Platform)
        );

        const results = await Promise.all(sendPromises);
        const success = results.some(r => r.success);

        logger.debug(
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
                const messageId = await this.twitchService.sendChatMessage(
                    accessToken,
                    connection.providerId,
                    connection.providerId,
                    message
                );
                return { messageId };
            }
        );
    }

    private async sendToYouTube(userId: string, message: string): Promise<PlatformResult> {
        return this.helper.sendWithRetry(
            'youtube',
            userId,
            async (accessToken, connection) => {
                let liveChatId: string | null = connection.chatroomId || null;

                if (!liveChatId) {
                    try {
                        liveChatId = await this.youtubeService.getActiveLiveChatId(accessToken, connection.providerId);
                    } catch (error) {
                        if (error instanceof Error && error.message.includes('cuota')) {
                            throw error;
                        }
                        throw new Error('No se pudo verificar el estado del directo en YouTube.');
                    }

                    if (!liveChatId) {
                        throw Object.assign(
                            new Error('Sin Live activo'),
                            { code: 'NO_LIVE_BROADCAST' }
                        );
                    }

                    connection.chatroomId = liveChatId;
                    await connection.save();
                }

                const messageId = await this.youtubeService.sendChatMessage(accessToken, liveChatId, message);
                return { messageId };
            }
        );
    }

    private async sendToKick(userId: string, message: string): Promise<PlatformResult> {
        return this.helper.sendWithRetry(
            'kick',
            userId,
            async (accessToken, connection) => {
                const messageId = await this.kickService.sendChatMessage(
                    accessToken,
                    connection.providerId,
                    message
                );
                return { messageId };
            }
        );
    }
}