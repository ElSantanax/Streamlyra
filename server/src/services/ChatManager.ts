/** Gestor de chat con orquestación de proveedores por plataforma */

import { Server } from 'socket.io';
import { Platform } from '../constants/platforms';
import { ConnectionService } from './connection/ConnectionService';
import { ChatProvider } from './chat/ChatProvider';
import { TwitchChatProvider } from './chat/TwitchChatProvider';
import { YouTubeChatProvider } from './chat/YouTubeChatProvider';
import { KickChatProvider } from './chat/KickChatProvider';
import { TikTokChatProvider } from './chat/TikTokChatProvider';
import { SafeSocketEmitter } from '../utils/SafeSocketEmitter';
import { withErrorHandling } from '../utils/errorHandling';
import { logger } from '../utils/logger';

export class ChatManager {
    private providers: Map<Platform, ChatProvider>;
    private youtubeProvider: YouTubeChatProvider;

    constructor(private io: Server, private connectionService: ConnectionService) {
        this.youtubeProvider = new YouTubeChatProvider(connectionService);
        
        this.providers = new Map<Platform, ChatProvider>([
            ['twitch', new TwitchChatProvider(connectionService)],
            ['youtube', this.youtubeProvider],
            ['kick', new KickChatProvider(connectionService)],
            ['tiktok', new TikTokChatProvider()]
        ]);
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

                // Obtener plataformas dinámicamente del Map para garantizar consistencia
                const platforms = Array.from(this.providers.keys());
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

                const provider = this.providers.get(platform);
                if (provider) {
                    await provider.connect(userId, this.io);
                    logger.info({ userId, platform }, 'Chat provider connected');
                } else {
                    logger.warn({ platform }, 'Unknown platform for chat connection');
                }
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

                const provider = this.providers.get(platform);
                if (provider) {
                    logger.debug({ userId, platform }, `ChatManager: Calling ${platform} disconnect`);
                    await provider.disconnect(userId);
                    logger.info({ platform, userId }, 'ChatManager: Chat provider disconnected successfully');
                } else {
                    logger.warn({ platform }, 'Unknown platform for chat disconnection');
                }
            },
            { platform, userId, action: 'disconnectProvider' },
            { rethrow: false }
        );
    }
}