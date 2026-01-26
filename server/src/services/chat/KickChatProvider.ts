/**
 * Proveedor de Chat de Kick
 * Responsabilidad: Orquestar conexión a chat de Kick
 */

import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { KickChannelManager } from './kick/KickChannelManager';
import { KickViewerPoller } from './kick/KickViewerPoller';
import { KickWebhookManager } from './kick/KickWebhookManager';
import { SocketEventEmitter } from '../../utils/SocketEventEmitter';
import { Connection } from '../../models/Connection.model';
import { User } from '../../models/User.model';
import { ConnectionService } from '../connection/ConnectionService';
import { logger } from '../../utils/logger';

export class KickChatProvider implements ChatProvider {
    private channelManager: KickChannelManager;
    private viewerPoller: KickViewerPoller;
    private webhookManager: KickWebhookManager;

    private connectingUsers: Set<string> = new Set();

    constructor(private connectionService: ConnectionService) {
        this.channelManager = new KickChannelManager();
        this.viewerPoller = new KickViewerPoller();
        this.webhookManager = new KickWebhookManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to Kick, skipping...');
            return;
        }

        this.connectingUsers.add(userId);

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
                SocketEventEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'Token inválido');
                this.connectingUsers.delete(userId);
                return;
            }

            logger.info({ userId }, 'Connecting to Kick');
            SocketEventEmitter.emitConnectionStatus(io, userId, 'kick', 'connecting');

            const channelInfo = await this.channelManager.getChannelInfo(accessToken);
            if (!channelInfo) {
                SocketEventEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'Canal no encontrado');
                this.connectingUsers.delete(userId);
                return;
            }

            const { broadcasterId, slug } = channelInfo;
            logger.info({ slug, broadcasterId, userId }, 'Kick channel found');

            await this.disconnect(userId);

            // Iniciar polling de espectadores
            this.viewerPoller.startPolling(userId, accessToken, io);

            logger.info({ slug, userId }, 'Connected to Kick chat');
            SocketEventEmitter.emitConnectionStatus(io, userId, 'kick', 'connected');

            // Registrar webhook (ahora con tracking en DB)
            void this.webhookManager.registerWebhook(userId, accessToken, broadcasterId);

        } catch (error) {
            logger.error({ err: error, userId }, 'Error connecting to Kick');
            SocketEventEmitter.emitConnectionStatus(io, userId, 'kick', 'error', 'Error de conexión');
        } finally {
            this.connectingUsers.delete(userId);
        }
    }

    async disconnect(userId: string): Promise<void> {
        this.viewerPoller.stopPolling(userId);
        
        // Obtener el broadcasterId del usuario para desactivar el webhook
        try {
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'kick' }
            });

            if (connection?.providerId) {
                await this.webhookManager.deactivateWebhook(connection.providerId);
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'Error desactivando webhook de Kick');
        }
        
        // NOTA: Kick no proporciona API para desregistrar webhooks
        // Los webhooks quedan registrados en Kick hasta que expiren
        // Sin embargo, ahora los trackeamos en DB y los marcamos como inactivos
        // El webhook processor verificará el estado antes de procesar eventos
        // 
        // TODO: Investigar si Kick agregó API para desregistrar webhooks
        // Referencia: https://docs.kick.com/docs/webhooks (verificar actualizaciones)
    }
}
