import { Server, Socket } from 'socket.io';
import colors from 'colors';
import { ChatManager } from '../services/ChatManager';

export const setupSocketHandlers = (io: Server) => {
    const chatManager = ChatManager.getInstance();
    chatManager.setIo(io);

    io.on('connection', (socket: Socket) => {
        console.log(colors.magenta('Nuevo cliente conectado al socket: ' + socket.id));

        socket.on('identify', async (userId: string) => {
            console.log(colors.cyan(`IDENTIFY recibido - UserId: ${userId} | SocketId: ${socket.id}`));
            socket.join(userId);
            console.log(colors.green(`Socket unido a sala: ${userId}`));

            await chatManager.connectUser(userId);
        });

        socket.on('disconnect', () => {
            console.log('Cliente desconectado');
            // Nota: Aquí se podría llamar a disconnectUser si queremos cerrar las conexiones inmediatamente
            // Por ahora lo dejamos vivo por si es una recarga rápida.
        });
    });
};
