/** Gestor de chat con orquestación de proveedores por plataforma */

import { Server } from 'socket.io';
import { Platform } from '../constants/platforms';
import { ConnectionService } from './connection/ConnectionService';
import { TwitchChatProvider } from './chat/TwitchChatProvider';
import { YouTubeChatProvider } from './chat/YouTubeChatProvider';
import { KickChatProvider } from './chat/KickChatProvider';
import { TikTokChatProvider } from './chat/TikTokChatProvider';
import { SafeSocketEmitter } from '../utils/SafeSocketEmitter';
import { withErrorHandling } from '../utils/errorHandling';
import { logger } from '../utils/logger';

export class ChatManager {
    private twitchProvider: TwitchChatProvider;
    private youtubeProvider: YouTubeChatProvider;
    private kickProvider: KickChatProvider;
    private tiktokProvider: TikTokChatProvider;

    constructor(private io: Server, private connectionService: ConnectionService) {
        this.twitchProvider = new TwitchChatProvider(connectionService);
        this.youtubeProvider = new YouTubeChatProvider(connectionService);
        this.kickProvider = new KickChatProvider(connectionService);
        this.tiktokProvider = new TikTokChatProvider();
    }

    async connectUser(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Connecting active chat providers');

                const connections = await this.connectionService.getAllConnections(userId);

                const promises = connections.map((conn: { provider: string }) =>
                    this.connectProvider(userId, conn.provider as Platform)
                );

                await Promise.allSettled(promises);

                logger.info({ userId, count: connections.length }, 'Active chat providers processed');
            },
            { userId, action: 'connectUser' },
            { rethrow: false }
        );
    }

    async disconnectUser(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Disconnecting all chat providers');

                const platforms: Platform[] = ['twitch', 'youtube', 'kick', 'tiktok'];
                const promises = platforms.map(platform =>
                    this.disconnectProvider(userId, platform)
                );

                await Promise.allSettled(promises);

                logger.info({ userId }, 'All chat providers disconnected');
            },
            { userId, action: 'disconnectUser' },
            { rethrow: false }
        );
    }

    async connectProvider(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId, platform }, 'Connecting chat provider');

                switch (platform) {
                    case 'twitch':
                        await this.twitchProvider.connect(userId, this.io);
                        break;
                    case 'youtube':
                        await this.youtubeProvider.connect(userId, this.io);
                        break;
                    case 'kick':
                        await this.kickProvider.connect(userId, this.io);
                        break;
                    case 'tiktok':
                        await this.tiktokProvider.connect(userId, this.io);
                        break;
                    default:
                        logger.warn({ platform }, 'Unknown platform for chat connection');
                }

                logger.info({ userId, platform }, 'Chat provider connected');
            },
            { userId, platform, action: 'connectProvider' },
            { rethrow: false }
        );
    }

    async boostYouTubeDiscovery(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Boosting YouTube discovery');
                await this.youtubeProvider.boostDiscovery(userId, this.io);
            },
            { userId, action: 'boostYouTubeDiscovery' },
            { rethrow: false }
        );
    }

    async disconnectProvider(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ platform, userId }, 'ChatManager: Disconnecting chat provider');

                SafeSocketEmitter.emitViewersUpdate(this.io, userId, platform, 0);

                switch (platform) {
                    case 'twitch':
                        logger.debug({ userId, platform }, 'ChatManager: Calling twitch disconnect');
                        await this.twitchProvider.disconnect(userId);
                        break;
                    case 'youtube':
                        logger.debug({ userId, platform }, 'ChatManager: Calling youtube disconnect');
                        await this.youtubeProvider.disconnect(userId);
                        break;
                    case 'kick':
                        logger.debug({ userId, platform }, 'ChatManager: Calling kick disconnect');
                        await this.kickProvider.disconnect(userId);
                        break;
                    case 'tiktok':
                        logger.debug({ userId, platform }, 'ChatManager: Calling tiktok disconnect');
                        await this.tiktokProvider.disconnect(userId);
                        break;
                }

                logger.info({ platform, userId }, 'ChatManager: Chat provider disconnected successfully');
            },
            { platform, userId, action: 'disconnectProvider' },
            { rethrow: false }
        );
    }
}