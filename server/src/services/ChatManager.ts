import { Server } from 'socket.io';
import { TwitchChatProvider } from './chat/TwitchChatProvider';
import { YouTubeChatProvider } from './chat/YouTubeChatProvider';
import colors from 'colors';

export class ChatManager {
    private io: Server;
    private twitchProvider = new TwitchChatProvider();
    private youtubeProvider = new YouTubeChatProvider();

    // Configuración para activar/desactivar plataformas
    private platformConfig = {
        twitch: true,
        youtube: true
    };

    constructor(io: Server) {
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

        } catch (error) {
            console.error(colors.red('[ChatManager] Error al conectar chats:'), error);
        }
    }

    public async disconnectUser(userId: string) {
        await Promise.all([
            this.twitchProvider.disconnect(userId),
            this.youtubeProvider.disconnect(userId)
        ]);
    }
}
