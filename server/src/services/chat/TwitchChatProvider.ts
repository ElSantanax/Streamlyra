import tmi from 'tmi.js';
import axios from 'axios';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { User } from '../../models/User.model';
import { AuthService } from '../AuthService';
import colors from 'colors';
import { TwitchStreamResponse } from '../../types/twitch.types';

export class TwitchChatProvider implements ChatProvider {
    private activeClients: Map<string, tmi.Client> = new Map();
    private viewerIntervals: Map<string, NodeJS.Timeout> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId, provider: 'twitch' },
            include: [User]
        });

        if (!connection || !connection.user) return;

        const validToken = await AuthService.getValidAccessToken(userId, 'twitch');

        const username = connection.providerUsername || connection.user.username;
        const accessToken = validToken || connection.accessToken;
        const providerId = connection.providerId; // Needed for API calls

        if (this.activeClients.has(userId)) {
            await this.disconnect(userId);
        }

        console.log(colors.cyan(`[TwitchChat] Conectando TMI para: ${username}`));

        // --- 1. Chat Connection (TMI) ---
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

        // Start polling for viewers
        this.startViewerPolling(userId, username, providerId, accessToken, io);

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
                isSub: tags.subscriber || false,
                isVIP: !!tags.vip,
                isOwner: tags.badges?.broadcaster === '1'
            };

            io.to(userId).emit('chat_message', chatMessage);
        });

        // Eventos Especiales (Suscripciones, etc)
        client.on('subscription', (_channel, username, _method, message, tags) => {
            const now = new Date();
            io.to(userId).emit('chat_message', {
                id: tags?.['id'] || Date.now().toString(),
                platform: 'twitch',
                user: username,
                message: message || '',
                specialMessage: `¡NUEVA SUSCRIPCIÓN! 🥳`,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSub: true
            });
        });

        client.on('resub', (_channel, username, _months, message, tags) => {
            const now = new Date();
            io.to(userId).emit('chat_message', {
                id: tags?.['id'] || Date.now().toString(),
                platform: 'twitch',
                user: username,
                message: message || '',
                specialMessage: `¡RE-SUSCRIPCIÓN! 🔥`,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isSub: true
            });
        });

        client.on('cheer', (_channel, userstate, message) => {
            const now = new Date();
            io.to(userId).emit('chat_message', {
                id: userstate.id || Date.now().toString(),
                platform: 'twitch',
                user: userstate['display-name'] || userstate.username || 'Unknown',
                message: message || '',
                specialMessage: `¡HA ENVIADO ${userstate.bits} BITS! 💎`,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
        });
    }

    private startViewerPolling(userId: string, username: string, providerId: string, accessToken: string, io: Server) {
        if (this.viewerIntervals.has(userId)) clearInterval(this.viewerIntervals.get(userId));

        const getStats = async () => {
            try {
                const clientId = process.env.TWITCH_CLIENT_ID;

                const response = await axios.get<TwitchStreamResponse>('https://api.twitch.tv/helix/streams', {
                    params: { user_login: username },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-Id': clientId
                    }
                });

                const stream = response.data.data[0];
                const viewerCount = stream ? stream.viewer_count : 0;
                // Si stream es undefined, es que está offline -> 0 viewers

                io.to(userId).emit('viewers_update', {
                    platform: 'twitch',
                    count: viewerCount
                });

            } catch (error) {
                console.error('[TwitchViewer] Error fetching stats:', error);
            }
        };

        // Ejecutar inmediatamente y luego cada 60s
        getStats();
        this.viewerIntervals.set(userId, setInterval(getStats, 60000));
    }

    async disconnect(userId: string): Promise<void> {
        // Chat disconnect
        const client = this.activeClients.get(userId);
        if (client) {
            try {
                await client.disconnect();
                this.activeClients.delete(userId);
            } catch (error) {
                console.error('[TwitchChat] Error desconectando:', error);
            }
        }

        // Viewer polling cleanup
        if (this.viewerIntervals.has(userId)) {
            clearInterval(this.viewerIntervals.get(userId));
            this.viewerIntervals.delete(userId);
        }
    }
}
