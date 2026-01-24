import { Server } from 'socket.io';
import { TwitchChatProvider } from './chat/TwitchChatProvider';
import { YouTubeChatProvider } from './chat/YouTubeChatProvider';
import { KickChatProvider } from './chat/KickChatProvider';
import { TikTokChatProvider } from './chat/TikTokChatProvider';
import colors from 'colors';

export class ChatManager {
    private static instance: ChatManager;
    private io!: Server;
    private twitchProvider = new TwitchChatProvider();
    private youtubeProvider = new YouTubeChatProvider();
    private kickProvider = new KickChatProvider();
    private tiktokProvider = new TikTokChatProvider();

    // Configuración para activar/desactivar plataformas
    private platformConfig = {
        twitch: true,
        youtube: true,
        kick: true,
        tiktok: true
    };

    private constructor() { }

    public static getInstance(): ChatManager {
        if (!ChatManager.instance) {
            ChatManager.instance = new ChatManager();
        }
        return ChatManager.instance;
    }

    public setIo(io: Server) {
        this.io = io;
    }

    public async connectUser(userId: string) {
        try {
            // 1. YouTube
            if (this.platformConfig.youtube) {
                await this.youtubeProvider.connect(userId, this.io);
            }

            // 2. Twitch
            if (this.platformConfig.twitch) {
                await this.twitchProvider.connect(userId, this.io);
            }

            // 3. Kick
            if (this.platformConfig.kick) {
                await this.kickProvider.connect(userId, this.io);
            }

            // 4. TikTok
            if (this.platformConfig.tiktok) {
                await this.tiktokProvider.connect(userId, this.io);
            }

        } catch (error) {
            console.error(colors.red('[ChatManager] Error al conectar chats:'), error);
        }
    }

    public async disconnectUser(userId: string) {
        await Promise.all([
            this.twitchProvider.disconnect(userId),
            this.youtubeProvider.disconnect(userId),
            this.kickProvider.disconnect(userId),
            this.tiktokProvider.disconnect(userId)
        ]);
    }

    public async disconnectProvider(userId: string, provider: string) {
        console.log(colors.yellow(`[ChatManager] Desconectando proveedor: ${provider} para el usuario: ${userId}`));

        // 1. Resetear espectadores en el Dashboard inmediatamente
        this.io.to(userId).emit('viewers_update', {
            platform: provider,
            count: 0
        });

        // 2. Cortar la conexión física con el servicio
        switch (provider) {
            case 'twitch':
                await this.twitchProvider.disconnect(userId);
                break;
            case 'youtube':
                await this.youtubeProvider.disconnect(userId);
                break;
            case 'kick':
                await this.kickProvider.disconnect(userId);
                break;
            case 'tiktok':
                await this.tiktokProvider.disconnect(userId);
                break;
        }
    }
}
