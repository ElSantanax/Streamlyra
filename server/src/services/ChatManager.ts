import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { User } from '../models/User.model';
import { Connection } from '../models/Connection.model';
import colors from 'colors';

// Mapeo para guardar los clientes de TMI activos: userId -> tmi.Client
const activeTmiClients: Map<string, tmi.Client> = new Map();

export class ChatManager {
    private io: Server;
    private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

    constructor(io: Server) {
        this.io = io;
    }

    // Inicia la escucha de chats para un usuario específico cuando entra al Dashboard
    public async connectUser(userId: string, socketId: string) {
        try {
            // 1. Buscar las credenciales de Twitch del usuario
            const connection = await Connection.findOne({
                where: { userId, provider: 'twitch' },
                include: [User]
            });

            if (!connection || !connection.user) {
                return;
            }

            const username = connection.user.username;
            const accessToken = connection.accessToken || '';

            // Limpiar sesiones previas si existen (simulación o real)
            this.disconnectUser(userId);

            // === MODO SIMULADOR ===
            if (username === 'devuser') {
                console.log(colors.yellow(`[ChatManager] Iniciando simulación para: ${username}`));
                this.startSimulation(userId);
                return;
            }

            console.log(colors.cyan(`[ChatManager] Conectando TMI para: ${username}`));

            // 2. Configurar cliente de TMI
            const client = new tmi.Client({
                options: { debug: false }, // Debug desactivado para limpiar consola
                identity: {
                    username: username,
                    password: `oauth:${accessToken}`
                },
                channels: [username]
            });

            // 3. Conectar a Twitch
            await client.connect();
            activeTmiClients.set(userId, client);
            console.log(colors.green(`✅ [ChatManager] Conectado a chat: ${username}`));

            // 4. Escuchar mensajes
            client.on('message', (channel, tags, message, self) => {
                const now = new Date();
                const chatMessage = {
                    id: tags.id || Date.now().toString(),
                    platform: 'twitch',
                    user: tags['display-name'] || tags.username || 'Unknown', // Frontend espera 'user'
                    message: message, // Frontend espera 'message'
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    color: tags.color || '#9146FF',
                    isMod: tags.mod || false,
                    isSub: tags.subscriber || false
                };

                // Emitir a la SALA del usuario (userId)
                this.io.to(userId).emit('chat_message', chatMessage);
            });

        } catch (error) {
            console.error(colors.red('[ChatManager] Error al conectar TMI:'), error);
        }
    }

    private startSimulation(userId: string) {
        console.log(`[ChatManager] Iniciando loop de simulación para: ${userId}`);

        // Mensaje de bienvenida inmediato
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
            "¡Qué buena partida!",
            "Saludos desde México 🇲🇽",
            "¿Cuándo juegas otra cosa?",
            "Jajajaja lol",
            "¡Ese headshot fue increíble!",
            "PogChamp",
            "Kappa",
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

            // Emitir a la sala del usuario
            this.io.to(userId).emit('chat_message', chatMessage);
        }, 3000); // Cada 3s

        this.simulationIntervals.set(userId, interval);
    }

    public async disconnectUser(userId: string) {
        // Limpiar simulación
        if (this.simulationIntervals.has(userId)) {
            clearInterval(this.simulationIntervals.get(userId));
            this.simulationIntervals.delete(userId);
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
}
