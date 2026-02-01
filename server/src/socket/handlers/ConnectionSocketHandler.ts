import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { SocketConnectionManager } from '../SocketConnectionManager';
import { ActivityService } from '../../services/ActivityService';

export class ConnectionSocketHandler {
    constructor(
        private connectionManager: SocketConnectionManager,
        private activityService: ActivityService
    ) {}

    setupHandler(socket: Socket, io: Server, authenticatedUserId: string) {
        // Handle initial connection identification
        this.connectionManager.handleIdentify(authenticatedUserId, socket, io);

        socket.on('identify', async () => {
            socket.emit('identified', { userId: authenticatedUserId, message: 'Conectado de forma segura' });
        });

        socket.on('youtube_boost_discovery', async () => {
            logger.info({ socketId: socket.id, userId: authenticatedUserId }, 'YouTube boost discovery requested');
            
            try {
                const chatManager = this.connectionManager.getChatManager();
                await chatManager.boostYouTubeDiscovery(authenticatedUserId);
                
                logger.info({ userId: authenticatedUserId }, 'YouTube boost discovery triggered successfully');
            } catch (error) {
                logger.error({ err: error, userId: authenticatedUserId }, 'Error triggering YouTube boost discovery');
            }
        });

        socket.on('disconnect', async () => {
            logger.info({ socketId: socket.id }, 'Cliente desconectado de Socket.io');
            const userId = this.connectionManager.getUserIdBySocketId(socket.id);
            await this.connectionManager.handleDisconnect(socket.id);

            if (userId && !io.sockets.adapter.rooms.get(userId)) {
                this.activityService.cleanupUser(userId);
            }
        });

        socket.on('error', (error: unknown) => {
            logger.error({ err: error, socketId: socket.id }, 'Error en Socket.io');
            socket.emit('error', {
                code: 'SOCKET_ERROR',
                message: 'Error en la conexión. Intenta de nuevo.'
            });
        });
    }
}
