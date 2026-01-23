import { Server } from 'socket.io';
import { User } from '../models/User.model';
import { TwitchChatProvider } from './chat/TwitchChatProvider';
import { YouTubeChatProvider } from './chat/YouTubeChatProvider';
import { SimulationChatProvider } from './chat/SimulationChatProvider';
import colors from 'colors';

export class ChatManager {
    private io: Server;
    private twitchProvider = new TwitchChatProvider();
    private youtubeProvider = new YouTubeChatProvider();
    private simulationProvider = new SimulationChatProvider();

    // Configuración para activar/desactivar plataformas
    private platformConfig = {
        twitch: false,
        youtube: true,
        simulation: false
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

            // 2. Twitch / Simulation
            if (!this.platformConfig.twitch && !this.platformConfig.simulation) {
                return;
            }

            const user = await User.findByPk(userId);
            if (!user) return;

            if (user.username === 'devuser' && this.platformConfig.simulation) {
                await this.simulationProvider.connect(userId, this.io);
            } else if (this.platformConfig.twitch) {
                await this.twitchProvider.connect(userId, this.io);
            }

        } catch (error) {
            console.error(colors.red('[ChatManager] Error al conectar chats:'), error);
        }
    }

    public async disconnectUser(userId: string) {
        await Promise.all([
            this.twitchProvider.disconnect(userId),
            this.youtubeProvider.disconnect(userId),
            this.simulationProvider.disconnect(userId)
        ]);
    }
}
