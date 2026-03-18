import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { SocketConnectionManager } from '../services/SocketConnectionManager';
import { AnalyticsService } from '../../services/core/AnalyticsService';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';

export class ConnectionSocketHandler {
    constructor(
        private connectionManager: SocketConnectionManager
    ) { }

    async setupHandler(socket: Socket, io: Server, authenticatedUserId: string) {
        await this.connectionManager.handleIdentify(authenticatedUserId, socket);
        Promise.all([
            AnalyticsService.getLastFollower(authenticatedUserId),
            AnalyticsService.getLastRaid(authenticatedUserId)
        ]).then(([follower, raid]) => {
            if (follower) SafeSocketEmitter.emitLastFollowerUpdate(io, authenticatedUserId, follower);
            if (raid) SafeSocketEmitter.emitLastRaidUpdate(io, authenticatedUserId, raid);
        }).catch(err => logger.error({ err, userId: authenticatedUserId }, 'Error enviando analíticas iniciales al conectar'));

        socket.on('identify', async () => {
            await this.connectionManager.handleIdentify(authenticatedUserId, socket);
            socket.emit('identified', { userId: authenticatedUserId, message: 'Conectado de forma segura' });
        });

        socket.on('logout', async () => {
            await this.connectionManager.handleLogout(authenticatedUserId);
        });

        socket.on('youtube_boost_discovery', async () => {
            logger.info({ socketId: socket.id, userId: authenticatedUserId }, 'YouTube boost discovery requested');
            try {
                await this.connectionManager.getChatManager().boostProviderDiscovery(authenticatedUserId, 'youtube', true);
            } catch (error) {
                logger.error({ err: error, userId: authenticatedUserId }, 'Error triggering YouTube boost discovery');
            }
        });

        socket.on('tiktok_boost_discovery', async () => {
            logger.info({ socketId: socket.id, userId: authenticatedUserId }, 'TikTok boost discovery requested');
            try {
                await this.connectionManager.getChatManager().boostProviderDiscovery(authenticatedUserId, 'tiktok');
            } catch (error) {
                logger.error({ err: error, userId: authenticatedUserId }, 'Error triggering TikTok boost discovery');
            }
        });

        socket.on('disconnect', async () => {
            logger.info({ socketId: socket.id }, 'Cliente desconectado de Socket.io');
            await this.connectionManager.handleDisconnect(socket.id);
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