/** Proveedor de chat de Kick con polling de espectadores y webhooks */

import { Server } from 'socket.io';
import { ChatProvider } from '../shared/ChatProvider';
import { KickManager } from './KickManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
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
            const connection = await this.connectionService.getAccount(userId, 'kick');

            if (!connection) {
                logger.debug({ userId }, 'No Kick connection found');
                this.connectingUsers.delete(userId);
                return;
            }

            const accessToken = await this.connectionService.getValidAccessToken(userId, 'kick', connection);

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

            // Solo detener el polling previo al reconectar, sin desactivar el webhook
            // en BD (evita la ventana donde mensajes son descartados silenciosamente)
            this.manager.stopViewerPolling(userId);

            this.manager.startViewerPolling(userId, accessToken, io);

            logger.info({ slug, userId }, 'Connected to Kick chat');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'connected', 'Conectado', channelInfo.isLive);

            await this.manager.registerWebhook(userId, accessToken, broadcasterId);

        } catch (error) {
            logger.error({ err: error, userId }, 'Error connecting to Kick');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'Error');
        } finally {
            this.connectingUsers.delete(userId);
        }
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'KickChatProvider: Deteniendo polling de espectadores');

        this.manager.stopViewerPolling(userId);

        logger.info({ userId }, 'KickChatProvider: Disconnect completed (webhook remains active)');
    }

    async onAccountDeleted(userId: string): Promise<void> {
        logger.info({ userId }, 'KickChatProvider: Permanent account deletion cleanup');
        try {
            const connection = await this.connectionService.getAccount(userId, 'kick');

            if (connection?.providerId) {
                // Desactivar webhook y limpiar registros
                await this.manager.deactivateWebhook(connection.providerId);
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'KickChatProvider: Error during permanent deletion cleanup');
        }
    }
}
