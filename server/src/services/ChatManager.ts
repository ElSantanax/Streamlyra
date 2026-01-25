import { Server } from 'socket.io';
import { TwitchChatProvider } from './chat/TwitchChatProvider';
import { YouTubeChatProvider } from './chat/YouTubeChatProvider';
import { KickChatProvider } from './chat/KickChatProvider';
import { TikTokChatProvider } from './chat/TikTokChatProvider';
import { ChatProvider } from './chat/ChatProvider';

type ProviderType = 'twitch' | 'youtube' | 'kick' | 'tiktok';

export class ChatManager {
    private providers: Record<ProviderType, ChatProvider> = {
        twitch: new TwitchChatProvider(),
        youtube: new YouTubeChatProvider(),
        kick: new KickChatProvider(),
        tiktok: new TikTokChatProvider()
    };

    constructor(private io: Server) { }

    async connectUser(userId: string) {
        try {
            await Promise.all(
                Object.values(this.providers).map(provider => provider.connect(userId, this.io))
            );
        } catch (error) {
            console.error('[ChatManager] Error connecting chats:', error);
        }
    }

    async connectProvider(userId: string, provider: ProviderType) {
        const chatProvider = this.providers[provider];
        if (chatProvider) {
            await chatProvider.connect(userId, this.io);
        }
    }

    async disconnectUser(userId: string) {
        await Promise.all(
            Object.values(this.providers).map(provider => provider.disconnect(userId))
        );
    }

    async disconnectProvider(userId: string, provider: ProviderType) {
        console.log(`[ChatManager] Desconectando proveedor: ${provider} para el usuario: ${userId}`);

        this.io.to(userId).emit('viewers_update', { platform: provider, count: 0 });

        const chatProvider = this.providers[provider];
        if (chatProvider) {
            await chatProvider.disconnect(userId);
        }
    }
}

