import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { User } from '../models/User.model';
import { Connection } from '../models/Connection.model';
import colors from 'colors';
import axios from 'axios';

// Mapeo para guardar los clientes de TMI activos: userId -> tmi.Client
const activeTmiClients: Map<string, tmi.Client> = new Map();

export class ChatManager {
    private io: Server;
    private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();
    private youtubeIntervals: Map<string, NodeJS.Timeout> = new Map();
    private youtubeNextPageTokens: Map<string, string> = new Map();
    private processedMessageIds: Map<string, Set<string>> = new Map();

    // Configuración para activar/desactivar plataformas
    private platformConfig = {
        twitch: false,   // 👈 Lo apago como pediste
        youtube: true,
        simulation: false // La simulación de Twitch (devuser)
    };

    constructor(io: Server) {
        this.io = io;
    }

    // Inicia la escucha de chats para un usuario específico cuando entra al Dashboard
    public async connectUser(userId: string, socketId: string) {
        try {
            // 1. YouTube Polling
            if (this.platformConfig.youtube) {
                const ytConnection = await Connection.findOne({
                    where: { userId, provider: 'youtube' }
                });

                if (ytConnection) {
                    console.log(colors.red(`[ChatManager] YouTube detectado para ${userId}, iniciando polling...`));
                    this.startYouTubePolling(userId, ytConnection.accessToken);
                }
            }

            // 2. Twitch / Simulation
            if (!this.platformConfig.twitch && !this.platformConfig.simulation) {
                console.log(colors.gray(`[ChatManager] Twitch/Simulation está desactivado por configuración`));
                return;
            }

            const connection = await Connection.findOne({
                where: { userId, provider: 'twitch' },
                include: [User]
            });

            if (!connection || !connection.user) {
                return;
            }

            const username = connection.user.username;
            const accessToken = connection.accessToken || '';

            // Limpiar sesiones previas de Twitch
            if (activeTmiClients.has(userId)) {
                await activeTmiClients.get(userId)?.disconnect();
                activeTmiClients.delete(userId);
            }

            // === MODO SIMULADOR ===
            if (username === 'devuser') {
                if (this.platformConfig.simulation) {
                    console.log(colors.yellow(`[ChatManager] Iniciando simulación para: ${username}`));
                    this.startSimulation(userId);
                }
                return;
            }

            if (!this.platformConfig.twitch) return;

            console.log(colors.cyan(`[ChatManager] Conectando TMI para: ${username}`));

            // 3. Configurar cliente de TMI
            const client = new tmi.Client({
                options: { debug: false },
                identity: {
                    username: username,
                    password: `oauth:${accessToken}`
                },
                channels: [username]
            });

            // 4. Conectar a Twitch
            await client.connect();
            activeTmiClients.set(userId, client);
            console.log(colors.green(`✅ [ChatManager] Conectado a chat: ${username}`));

            // 5. Escuchar mensajes
            client.on('message', (channel, tags, message, self) => {
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

                this.io.to(userId).emit('chat_message', chatMessage);
            });

        } catch (error) {
            console.error(colors.red('[ChatManager] Error al conectar chats:'), error);
        }
    }

    private startSimulation(userId: string) {
        if (this.simulationIntervals.has(userId)) return;

        setTimeout(() => {
            const now = new Date();
            this.io.to(userId).emit('chat_message', {
                id: 'sys-welcome',
                platform: 'twitch',
                user: 'System Bot',
                message: '¡Conexión establecida con el servidor de chat (Simulado)!',
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                specialMessage: '¡Bienvenido al modo DEV!'
            });
        }, 1000);

        const fakeMessages = [
            "¡Hola Streamer! ¿Cómo va todo?",
            "PogChamp",
            "Streamlyra está quedando genial 🚀"
        ];

        const interval = setInterval(() => {
            const randomMsg = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
            const now = new Date();

            const chatMessage = {
                id: Date.now().toString(),
                platform: 'twitch',
                user: `Viewer_${Math.floor(Math.random() * 100)}`,
                message: randomMsg,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMod: Math.random() > 0.8,
                isSub: Math.random() > 0.7
            };

            this.io.to(userId).emit('chat_message', chatMessage);
        }, 3000);

        this.simulationIntervals.set(userId, interval);
    }

    public async disconnectUser(userId: string) {
        // Limpiar simulación
        if (this.simulationIntervals.has(userId)) {
            clearInterval(this.simulationIntervals.get(userId));
            this.simulationIntervals.delete(userId);
        }

        // Limpiar YouTube
        if (this.youtubeIntervals.has(userId)) {
            clearTimeout(this.youtubeIntervals.get(userId));
            this.youtubeIntervals.delete(userId);
            this.youtubeNextPageTokens.delete(userId);
            this.processedMessageIds.delete(userId);
        }

        // Limpiar cliente TMI real
        if (activeTmiClients.has(userId)) {
            try {
                await activeTmiClients.get(userId)?.disconnect();
                activeTmiClients.delete(userId);
            } catch (error) {
                console.error('Error desconectando TMI:', error);
            }
        }
    }

    private async startYouTubePolling(userId: string, accessToken: string) {
        try {
            console.log(colors.red(`[ChatManager] Buscando Live Chat ID para YouTube userId: ${userId}`));

            const broadcastResponse = await axios.get('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
                params: {
                    part: 'snippet,status',
                    mine: true,
                    broadcastType: 'all',
                    maxResults: 5
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const broadcasts = broadcastResponse.data.items;
            if (!broadcasts || broadcasts.length === 0) {
                console.log(colors.gray(`[ChatManager] No se encontraron directos en YouTube para ${userId}`));
                return;
            }

            const activeBroadcast = broadcasts.find((b: any) =>
                b.status.lifeCycleStatus === 'live' || b.snippet.liveChatId
            );

            if (!activeBroadcast || !activeBroadcast.snippet.liveChatId) {
                console.log(colors.gray(`[ChatManager] No hay stream "En Vivo" actualmente en YouTube para ${userId}`));
                return;
            }

            const liveChatId = activeBroadcast.snippet.liveChatId;
            console.log(colors.green(`✅ [ChatManager] YouTube Chat detectado: ${liveChatId}`));

            const poll = async () => {
                if (!this.youtubeIntervals.has(userId)) return;

                try {
                    const pageToken = this.youtubeNextPageTokens.get(userId);
                    const response = await axios.get('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                        params: {
                            liveChatId,
                            part: 'snippet,authorDetails',
                            pageToken: pageToken
                        },
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    });

                    const { items, nextPageToken, pollingIntervalMillis } = response.data;
                    this.youtubeNextPageTokens.set(userId, nextPageToken);

                    if (items && items.length > 0) {
                        if (!this.processedMessageIds.has(userId)) {
                            this.processedMessageIds.set(userId, new Set());
                        }
                        const seenIds = this.processedMessageIds.get(userId)!;

                        items.forEach((item: any) => {
                            if (seenIds.has(item.id)) return;

                            const chatMessage = {
                                id: item.id,
                                platform: 'youtube',
                                user: item.authorDetails.displayName,
                                message: item.snippet.displayMessage,
                                time: new Date(item.snippet.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                avatar: item.authorDetails.profileImageUrl,
                                isMod: item.authorDetails.isChatModerator,
                                isOwner: item.authorDetails.isChatOwner
                            };

                            seenIds.add(item.id);
                            if (seenIds.size > 200) {
                                const firstValue = seenIds.values().next().value;
                                if (firstValue !== undefined) seenIds.delete(firstValue);
                            }

                            this.io.to(userId).emit('chat_message', chatMessage);
                        });
                    }

                    const nextInterval = pollingIntervalMillis || 5000;
                    this.youtubeIntervals.set(userId, setTimeout(poll, nextInterval));

                } catch (error: any) {
                    console.error('[YouTube Poll Error]', error.response?.data || error.message);
                    this.youtubeIntervals.delete(userId);
                }
            };

            this.youtubeIntervals.set(userId, setTimeout(() => { }, 0));
            poll();

        } catch (error: any) {
            console.error('[YouTube Chat Start Error]', error.response?.data || error.message);
        }
    }
}
