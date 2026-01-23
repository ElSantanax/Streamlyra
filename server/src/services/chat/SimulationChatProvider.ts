import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import colors from 'colors';

export class SimulationChatProvider implements ChatProvider {
    private intervals: Map<string, NodeJS.Timeout> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        if (this.intervals.has(userId)) return;

        console.log(colors.yellow(`[SimulationChat] Iniciando para: ${userId}`));

        setTimeout(() => {
            const now = new Date();
            io.to(userId).emit('chat_message', {
                id: 'sys-welcome',
                platform: 'twitch',
                user: 'System Bot',
                message: '¡Conexión establecida con el servidor de chat (Simulado)!',
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                specialMessage: '¡Bienvenido al modo DEV!'
            });
        }, 1000);

        const fakeMessages = ["¡Hola Streamer!", "PogChamp", "Streamlyra 🚀"];

        const interval = setInterval(() => {
            const randomMsg = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
            const now = new Date();

            io.to(userId).emit('chat_message', {
                id: Date.now().toString(),
                platform: 'twitch',
                user: `Viewer_${Math.floor(Math.random() * 100)}`,
                message: randomMsg,
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMod: Math.random() > 0.8,
                isSub: Math.random() > 0.7
            });
        }, 3000);

        this.intervals.set(userId, interval);
    }

    async disconnect(userId: string): Promise<void> {
        if (this.intervals.has(userId)) {
            clearInterval(this.intervals.get(userId));
            this.intervals.delete(userId);
        }
    }
}
