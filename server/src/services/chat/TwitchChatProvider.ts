import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { User } from '../../models/User.model';
import { AuthService } from '../AuthService';
import colors from 'colors';

export class TwitchChatProvider implements ChatProvider {
    private activeClients: Map<string, tmi.Client> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId, provider: 'twitch' },
            include: [User]
        });

        if (!connection || !connection.user) return;

        const validToken = await AuthService.getValidAccessToken(userId, 'twitch');

        const username = connection.user.username;
        const accessToken = validToken || connection.accessToken;

        if (this.activeClients.has(userId)) {
            await this.disconnect(userId);
        }

        console.log(colors.cyan(`[TwitchChat] Conectando TMI para: ${username}`));

        const client = new tmi.Client({
            options: { debug: false },
            identity: {
                username: username,
                password: `oauth:${accessToken}`
            },
            channels: [username]
        });

        await client.connect();
        this.activeClients.set(userId, client);
        console.log(colors.green(`✅ [TwitchChat] Conectado a chat: ${username}`));

        client.on('message', (_channel, tags, message, _self) => {
            const now = new Date();
            const chatMessage = {
                id: tags.id || Date.now().toString(),
                platform: 'twitch',
                user: tags['display-name'] || tags.username || 'Unknown',
                message: message,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                color: tags.color || '#9146FF',
                isMod: tags.mod || false,
                isSub: tags.subscriber || false
            };

            io.to(userId).emit('chat_message', chatMessage);
        });
    }

    async disconnect(userId: string): Promise<void> {
        const client = this.activeClients.get(userId);
        if (client) {
            try {
                await client.disconnect();
                this.activeClients.delete(userId);
            } catch (error) {
                console.error('[TwitchChat] Error desconectando:', error);
            }
        }
    }
}
