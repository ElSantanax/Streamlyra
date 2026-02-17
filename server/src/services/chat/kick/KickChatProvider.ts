/** Proveedor de chat de Kick con polling de espectadores y webhooks */

import { Server } from 'socket.io';
import { ChatProvider } from '../shared/ChatProvider';
import { KickManager } from './KickManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { User } from '../../../models/User.model';
import { ConnectionService } from '../../connection/ConnectionService';
import { logger } from '../../../utils/logger';

export class KickChatProvider implements ChatProvider {
    private manager: KickManager;
    private connectingUsers: Set<string> = new Set();

    constructor(private connectionService: ConnectionService) {
        this.manager = new KickManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to Kick, skipping...');
            return;
        }

        this.connectingUsers.add(userId);

        if (this.manager.isPolling(userId)) {
            logger.debug({ userId }, 'Kick already connected and polling, returning early');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'connected', 'Conectado');
            this.connectingUsers.delete(userId);
            return;
        }

        try {
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'kick' },
                include: [User]
            });

            if (!connection || !connection.user) {
                logger.debug({ userId }, 'No Kick connection found');
                this.connectingUsers.delete(userId);
                return;
            }

            const accessToken = await this.connectionService.getValidAccessToken(userId, 'kick');

            if (!accessToken) {
                logger.error({ userId }, 'No Kick access token');
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'Error sesión');
                this.connectingUsers.delete(userId);
                return;
            }

            logger.info({ userId }, 'Connecting to Kick');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'connecting', 'Buscando...');

            const channelInfo = await this.manager.getChannelInfo(accessToken, userId, io);
            if (!channelInfo) {
                SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'No encontrado');
                this.connectingUsers.delete(userId);
                return;
            }

            const { broadcasterId, slug } = channelInfo;
            logger.info({ slug, broadcasterId, userId }, 'Kick channel found');

            await this.disconnect(userId);

            this.manager.startViewerPolling(userId, accessToken, io);

            logger.info({ slug, userId }, 'Connected to Kick chat');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'connected', 'Conectado', channelInfo.isLive);

            void this.manager.registerWebhook(userId, accessToken, broadcasterId);

        } catch (error) {
            logger.error({ err: error, userId }, 'Error connecting to Kick');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'Error');
        } finally {
            this.connectingUsers.delete(userId);
        }
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'KickChatProvider: Starting disconnect');

        this.manager.stopViewerPolling(userId);
        logger.debug({ userId }, 'KickChatProvider: Viewer polling stopped');

        // Obtener el broadcasterId del usuario para desactivar el webhook
        try {
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'kick' }
            });

            if (connection?.providerId) {
                logger.debug({ userId, broadcasterId: connection.providerId }, 'KickChatProvider: Deactivating webhook');
                await this.manager.deactivateWebhook(connection.providerId);
            } else {
                logger.debug({ userId }, 'KickChatProvider: No connection found, skipping webhook deactivation');
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'Error desactivando webhook de Kick');
        }

        logger.info({ userId }, 'KickChatProvider: Disconnect completed');
    }

    async onAccountDeleted(userId: string): Promise<void> {
        logger.info({ userId }, 'KickChatProvider: Permanent account deletion cleanup');
        try {
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'kick' }
            });

            if (connection?.providerId) {
                // Desactivar webhook y limpiar registros
                await this.manager.deactivateWebhook(connection.providerId);
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'KickChatProvider: Error during permanent deletion cleanup');
        }
    }
}
