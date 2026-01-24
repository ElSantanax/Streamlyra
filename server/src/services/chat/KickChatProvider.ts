import axios, { AxiosError } from 'axios';
import { Server } from 'socket.io';
import Pusher from 'pusher-js';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { User } from '../../models/User.model';
import { AuthService } from '../AuthService';
import { KickService } from '../platforms/KickService';
import colors from 'colors';
import { KickApiResponse, KickChannel, KickChatMessagePayload } from '../../types/kick.types';

export class KickChatProvider implements ChatProvider {
    private pusherClients: Map<string, Pusher> = new Map();
    private viewerIntervals: Map<string, NodeJS.Timeout> = new Map();
    private messageIntervals: Map<string, NodeJS.Timeout> = new Map();
    private processedMessages: Map<string, Set<string>> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId, provider: 'kick' },
            include: [User]
        });

        if (!connection || !connection.user) return;

        const accessToken = await AuthService.getValidAccessToken(userId, 'kick');
        if (!accessToken) {
            console.error(colors.red('[KickChat] No se pudo obtener el Access Token.'));
            return;
        }

        try {
            // 1. Obtener info oficial del canal
            const channels = await KickService.getChannelByToken(accessToken);
            if (!channels || channels.length === 0) {
                console.error(colors.red('[KickChat] No se encontró información del canal.'));
                return;
            }

            const kickChannel = channels[0];
            const broadcasterId = kickChannel.broadcaster_user_id.toString();
            const channelSlug = kickChannel.slug;

            console.log(colors.cyan(`[KickChat] Activando servicios para: ${channelSlug} (ID: ${broadcasterId})`));

            await this.disconnect(userId);

            // 2. INICIAR CONEXIÓN WEBSOCKET (Fallback)
            this.setupPusher(userId, broadcasterId, channelSlug, io);

            // 3. INICIAR POLLING DE SEGURIDAD (Authorized Polling)
            this.startMessagePolling(userId, channelSlug, accessToken, io, broadcasterId);

            // 4. ANALÍTICAS
            this.startViewerPolling(userId, accessToken, io);

            console.log(colors.green(`✅ [KickChat] Servicios iniciados para ${channelSlug}.`));

            // 5. AUTO-REGISTRO DE WEBHOOK (Si hay APP_URL https)
            const appUrl = process.env.APP_URL;
            if (appUrl && appUrl.startsWith('https://')) {
                void KickService.subscribeToChat(accessToken, broadcasterId)
                    .then(() => {
                        console.log(colors.blue(`[KickChat] Suscripción a Webhooks solicitada para ${broadcasterId}`));
                    })
                    .catch(() => { /* Error silencioso en auto-sus */ });
            }

        } catch (error) {
            console.error('[KickChat] Error en connect:', error);
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
            console.log(colors.green(`✅ [KickChat] WebSocket conectado (${username})`));
        });

        pusher.connection.bind('error', (err: { error?: { data?: { code?: number, message?: string } } }) => {
            if (err.error?.data?.code === 4001) {
                // Silencioso, usamos polling
            }
        });

        const handleMsg = (data: KickChatMessagePayload) => this.emitMessage(userId, data, io, broadcasterId);

        pusherChannel.bind('App\\Events\\ChatMessageEvent', handleMsg);
        pusherChannel.bind('chat.message.sent', handleMsg);

        this.pusherClients.set(userId, pusher);
    }

    private emitMessage(userId: string, data: KickChatMessagePayload, io: Server, broadcasterId: string) {
        const msgId = data.id || data.message_id || Date.now().toString();

        if (!this.processedMessages.has(userId)) this.processedMessages.set(userId, new Set<string>());
        const msgSet = this.processedMessages.get(userId) as Set<string>;

        if (msgSet.has(msgId)) return;
        msgSet.add(msgId);

        if (msgSet.size > 500) {
            const first = msgSet.values().next().value as string | undefined;
            if (first !== undefined) msgSet.delete(first);
        }

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

        // console.log(colors.gray(`[KickChat] Emitiendo mensaje de ${chatMessage.user} a sala ${userId}`));
        io.to(userId).emit('chat_message', chatMessage);
    }

    private startMessagePolling(userId: string, channelSlug: string, accessToken: string, io: Server, broadcasterId: string) {
        const fetchMessages = async () => {
            try {
                // console.log(`[KickChat] Polling mensajes para ${channelSlug}...`);
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
                // Ocultamos los 500 de polling ya que el Webhook está funcionando
                if (axiosErr.response?.status !== 500) {
                    console.error(colors.yellow(`[KickChat] Polling Error (${axiosErr.response?.status}): ${axiosErr.message}`));
                }
            }
        };

        this.messageIntervals.set(userId, setInterval(() => { void fetchMessages(); }, 5000));
    }

    private startViewerPolling(userId: string, accessToken: string, io: Server) {
        const getStats = async () => {
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
                // Silencioso
            }
        };

        void getStats();
        this.viewerIntervals.set(userId, setInterval(() => { void getStats(); }, 60000));
    }

    async disconnect(userId: string): Promise<void> {
        const pusher = this.pusherClients.get(userId);
        if (pusher) pusher.disconnect();
        this.pusherClients.delete(userId);

        const msgInt = this.messageIntervals.get(userId);
        if (msgInt) clearInterval(msgInt);
        this.messageIntervals.delete(userId);

        const viewInt = this.viewerIntervals.get(userId);
        if (viewInt) clearInterval(viewInt);
        this.viewerIntervals.delete(userId);

        this.processedMessages.delete(userId);
    }
}
