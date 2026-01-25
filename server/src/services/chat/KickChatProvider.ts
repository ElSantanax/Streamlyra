import axios, { AxiosError } from 'axios';
import { Server } from 'socket.io';
import Pusher from 'pusher-js';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { User } from '../../models/User.model';
import { ConnectionService } from '../connection/ConnectionService';
import { KickService } from '../platforms/KickService';
import { MessageDeduplicator } from '../../utils/messageDeduplicate';
import { PollingManager } from './PollingManager';
import { KickApiResponse, KickChannel, KickChatMessagePayload } from '../../types/kick.types';

export class KickChatProvider implements ChatProvider {
    private pusherClients: Map<string, Pusher> = new Map();
    private messagePolling: PollingManager = new PollingManager();
    private viewerPolling: PollingManager = new PollingManager();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'kick' },
            include: [User]
        });

        if (!connection || !connection.user) return;

        const accessToken = await ConnectionService.getValidAccessToken(userId, 'kick');
        if (!accessToken) return console.error('[KickChat] No Access Token.');

        io.to(userId).emit('connection_status', { platform: 'kick', status: 'connecting' });

        try {
            const channels = await KickService.getChannelByToken(accessToken);
            if (!channels?.length) return console.error('[KickChat] Canal no encontrado.');

            const { broadcaster_user_id, slug } = channels[0];
            const broadcasterId = broadcaster_user_id.toString();

            await this.disconnect(userId);

            this.setupPusher(userId, broadcasterId, slug, io);
            this.startMessagePolling(userId, slug, accessToken, io, broadcasterId);
            this.startViewerPolling(userId, accessToken, io);

            io.to(userId).emit('connection_status', { platform: 'kick', status: 'connected' });

            if (process.env.APP_URL?.startsWith('https://')) {
                void KickService.subscribeToChat(accessToken, broadcasterId).catch(() => { });
            }
        } catch (error) {
            console.error('[KickChat] Error:', error);
            io.to(userId).emit('connection_status', { platform: 'kick', status: 'error' });
        }
    }

    private setupPusher(userId: string, broadcasterId: string, username: string, io: Server) {
        const pusher = new Pusher('eb1d5f283081a78b931d', {
            cluster: 'mt1',
            forceTLS: true,
            enabledTransports: ['ws', 'wss']
        });

        const channelName = `chatrooms.${broadcasterId}.v2`;
        const pusherChannel = pusher.subscribe(channelName);

        pusher.connection.bind('connected', () => {
            console.log(`[KickChat] ✅ WebSocket conectado (${username})`);
        });

        const handleMsg = (data: KickChatMessagePayload) => this.emitMessage(userId, data, io, broadcasterId);

        pusherChannel.bind('App\\Events\\ChatMessageEvent', handleMsg);
        pusherChannel.bind('chat.message.sent', handleMsg);

        this.pusherClients.set(userId, pusher);
    }

    private emitMessage(userId: string, data: KickChatMessagePayload, io: Server, broadcasterId: string) {
        const msgId = data.id || data.message_id || Date.now().toString();

        if (!this.deduplicators.has(userId)) {
            this.deduplicators.set(userId, new MessageDeduplicator());
        }
        const dedup = this.deduplicators.get(userId)!;

        if (dedup.isDuplicate(msgId)) return;

        const chatMessage = {
            id: msgId,
            platform: 'kick',
            user: data.sender.username || 'Sistema',
            message: data.content || '',
            time: new Date(data.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            color: data.sender.identity?.username_color || '#53FC18',
            isMod: data.sender.identity?.badges.some((b) => b.type === 'moderator'),
            isSub: data.sender.identity?.badges.some((b) => b.type === 'subscriber'),
            isOwner: broadcasterId === data.sender.id.toString() || broadcasterId === data.sender.user_id.toString()
        };

        io.to(userId).emit('chat_message', chatMessage);
    }

    private startMessagePolling(userId: string, channelSlug: string, accessToken: string, io: Server, broadcasterId: string) {
        this.messagePolling.start(userId, async () => {
            try {
                const response = await axios.get<KickApiResponse<{ messages: KickChatMessagePayload[] }>>(`https://kick.com/api/v2/channels/${channelSlug}/messages`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                        'Accept': 'application/json'
                    },
                    timeout: 5000
                });

                const messages = response.data.data.messages || [];
                messages.reverse().forEach((msg) => this.emitMessage(userId, msg, io, broadcasterId));

            } catch (error) {
                const axiosErr = error as AxiosError;
                if (axiosErr.response?.status !== 500) {
                    console.error(`[KickChat] Polling error (${axiosErr.response?.status}): ${axiosErr.message}`);
                }
            }
        }, 5000);
    }

    private startViewerPolling(userId: string, accessToken: string, io: Server) {
        this.viewerPolling.start(userId, async () => {
            try {
                const response = await axios.get<KickApiResponse<KickChannel[]>>('https://api.kick.com/public/v1/channels', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (response.data.data && response.data.data.length > 0) {
                    const streamData = response.data.data[0].stream;
                    io.to(userId).emit('viewers_update', {
                        platform: 'kick',
                        count: streamData ? streamData.viewer_count : 0
                    });
                }
            } catch {
                // Ignore errors during background polling
            }
        });
    }

    async disconnect(userId: string): Promise<void> {
        const pusher = this.pusherClients.get(userId);
        if (pusher) pusher.disconnect();
        this.pusherClients.delete(userId);

        this.messagePolling.stop(userId);
        this.viewerPolling.stop(userId);
        this.deduplicators.delete(userId);
    }
}
