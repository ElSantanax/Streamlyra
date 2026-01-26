/**
 * Gestor de Chat
 * Responsabilidad: Orquestar conexión a proveedores de chat
 */

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

    /**
     * Conecta todas las plataformas del usuario
     */
    async connectUser(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Connecting active chat providers');

                // 1. Obtener conexiones activas del usuario
                const connections = await this.connectionService.getAllConnections(userId);

                // 2. Conectar solo las plataformas que tienen conexión
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

    /**
     * Desconecta todas las plataformas del usuario
     */
    async disconnectUser(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Disconnecting all chat providers');

                // Desconectar todas las plataformas
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

    /**
     * Conecta una plataforma específica
     */
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
                        // No lanzar error para no interrumpir otros flujos, solo logear
                        logger.warn({ platform }, 'Unknown platform for chat connection');
                }

                logger.info({ userId, platform }, 'Chat provider connected');
            },
            { userId, platform, action: 'connectProvider' },
            { rethrow: false }
        );
    }

    /**
     * Desconecta una plataforma específica
     */
    async disconnectProvider(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ platform, userId }, 'ChatManager: Disconnecting chat provider');

                // Notificar al cliente que se desconectó (UI update)
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

                logger.info({ platform, userId }, 'Chat provider disconnected');
            },
            { platform, userId, action: 'disconnectProvider' },
            { rethrow: false }
        );
    }
}