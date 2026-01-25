import { Server, Socket } from 'socket.io';
import { ChatManager } from '../services/ChatManager';

export const setupSocketHandlers = (io: Server, chatManager: ChatManager) => {

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] Nuevo cliente conectado: ${socket.id}`);

        socket.on('identify', async (userId: string) => {
            try {
                socket.join(userId);
                console.log(`[Socket] Usuario ${userId} identificado`);
                await chatManager.connectUser(userId);
            } catch (error) {
                console.error(`[Socket] Error connecting user ${userId}:`, error);
                socket.emit('error', { message: 'Connection failed' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Cliente desconectado');
        });
    });
};
