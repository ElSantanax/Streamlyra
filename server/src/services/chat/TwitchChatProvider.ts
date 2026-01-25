import tmi from 'tmi.js';
import axios from 'axios';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { User } from '../../models/User.model';
import { ConnectionService } from '../connection/ConnectionService';
import { TwitchStreamResponse } from '../../types/twitch.types';
import { PollingManager } from './PollingManager';
import { config } from '../../config';

export class TwitchChatProvider implements ChatProvider {
    private activeClients: Map<string, tmi.Client> = new Map();
    private polling: PollingManager = new PollingManager();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'twitch' },
            include: [User]
        });

        if (!connection || !connection.user) return;

        const validToken = await ConnectionService.getValidAccessToken(userId, 'twitch');
        const username = connection.providerUsername || connection.user.username;
        const accessToken = validToken || connection.accessToken;
        const providerId = connection.providerId;

        if (this.activeClients.has(userId)) {
            await this.disconnect(userId);
        }

        io.to(userId).emit('connection_status', { platform: 'twitch', status: 'connecting' });

        console.log(`[TwitchChat] Conectando TMI para: ${username}`);

        const client = new tmi.Client({
            options: { debug: false },
            connection: { reconnect: true, secure: true },
            identity: { username: username, password: `oauth:${accessToken}` },
            channels: [username]
        });

        try {
            await client.connect();
            this.activeClients.set(userId, client);
            console.log(`[TwitchChat] ✅ Conectado a chat: ${username}`);

            io.to(userId).emit('connection_status', { platform: 'twitch', status: 'connected' });

            this.startViewerPolling(userId, username, providerId, accessToken, io);
            this.setupListeners(userId, client, io);
        } catch (error) {
            console.error(`[TwitchChat] Error conectando a Twitch para ${username}:`, error);
            io.to(userId).emit('connection_status', { platform: 'twitch', status: 'error' });
        }
    }

    private setupListeners(userId: string, client: tmi.Client, io: Server) {

        client.on('message', (_channel, tags, message, _self) => {
            const now = new Date();
            io.to(userId).emit('chat_message', {
                id: tags.id || Date.now().toString(),
                platform: 'twitch',
                user: tags['display-name'] || tags.username || 'Unknown',
                message,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                color: tags.color || '#9146FF',
                isMod: tags.mod || false,
                isSub: tags.subscriber || false,
                isVIP: !!tags.vip,
                isOwner: tags.badges?.broadcaster === '1'
            });
        });

        client.on('subscription', (_channel, username, _method, message, tags) => {
            io.to(userId).emit('chat_message', {
                id: tags?.['id'] || Date.now().toString(),
                platform: 'twitch',
                user: username,
                message: message || '',
                specialMessage: `¡NUEVA SUSCRIPCIÓN! 🥳`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSub: true
            });
        });

        client.on('resub', (_channel, username, _months, message, tags) => {
            io.to(userId).emit('chat_message', {
                id: tags?.['id'] || Date.now().toString(),
                platform: 'twitch',
                user: username,
                message: message || '',
                specialMessage: `¡RE-SUSCRIPCIÓN! 🔥`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSub: true
            });
        });

        client.on('cheer', (_channel, userstate, message) => {
            io.to(userId).emit('chat_message', {
                id: userstate.id || Date.now().toString(),
                platform: 'twitch',
                user: userstate['display-name'] || userstate.username || 'Unknown',
                message: message || '',
                specialMessage: `¡HA ENVIADO ${userstate.bits} BITS! 💎`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
        });
    }

    private startViewerPolling(userId: string, username: string, _providerId: string, accessToken: string, io: Server) {
        this.polling.start(userId, async () => {
            try {
                const response = await axios.get<TwitchStreamResponse>('https://api.twitch.tv/helix/streams', {
                    params: { user_login: username },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-Id': config.twitch.clientId!
                    }
                });

                const stream = response.data.data[0];
                io.to(userId).emit('viewers_update', {
                    platform: 'twitch',
                    count: stream ? stream.viewer_count : 0
                });

            } catch (error) {
                console.error('[TwitchChat] Viewer polling error:', error);
            }
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
        this.polling.stop(userId);
    }
}
