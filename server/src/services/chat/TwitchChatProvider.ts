import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { TwitchConnectionManager } from './twitch/TwitchConnectionManager';
import { TwitchEventListener } from './twitch/TwitchEventListener';
import { TwitchViewerPoller } from './twitch/TwitchViewerPoller';
import { TwitchEventTransformer } from './transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { Connection } from '../../models/Connection.model';
import { ConnectionService } from '../connection/ConnectionService';
import { logger } from '../../utils/logger';

export class TwitchChatProvider implements ChatProvider {
    private activeClients: Map<string, tmi.Client> = new Map();
    private connectingUsers: Set<string> = new Set();
    private transformer: TwitchEventTransformer;
    private connectionManager: TwitchConnectionManager;
    private eventListener: TwitchEventListener;
    private viewerPoller: TwitchViewerPoller;

    constructor(private connectionService: ConnectionService) {
        this.transformer = new TwitchEventTransformer();
        this.connectionManager = new TwitchConnectionManager(connectionService);
        this.eventListener = new TwitchEventListener(this.transformer);
        this.viewerPoller = new TwitchViewerPoller();
    }

    async connect(userId: string, io: Server): Promise<void> {
        // Evitar múltiples conexiones simultáneas para el mismo usuario
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to Twitch, skipping...');
            return;
        }

        // Si ya está conectado, asegurar que el cliente reciba el estado actual
        if (this.activeClients.has(userId)) {
            logger.debug({ userId }, 'User already has an active Twitch client, refreshing state');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected');

            // Provocar un poll inmediato para que el cliente reciba estadísticas rápido
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'twitch' }
            });
            if (connection?.providerUsername) {
                const validToken = await this.connectionService.getValidAccessToken(userId, 'twitch');
                this.viewerPoller.startPolling(userId, connection.providerUsername, validToken || connection.accessToken, io);
            }
            return;
        }

        this.connectingUsers.add(userId);

        try {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connecting');
            logger.info({ userId }, 'Connecting to Twitch chat');

            const client = await this.connectionManager.connect(userId);
            this.activeClients.set(userId, client);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected');

            this.eventListener.setupListeners(userId, client, io);

            // Get username for polling
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'twitch' }
            });

            if (connection?.providerUsername) {
                const validToken = await this.connectionService.getValidAccessToken(userId, 'twitch');
                const accessToken = validToken || connection.accessToken;
                this.viewerPoller.startPolling(userId, connection.providerUsername, accessToken, io);
            }

        } catch (error) {
            logger.error({ err: error, userId }, 'Error connecting to Twitch');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'error');
            this.activeClients.delete(userId);
        } finally {
            this.connectingUsers.delete(userId);
        }
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TwitchChatProvider: Starting disconnect');

        const client = this.activeClients.get(userId);
        if (client) {
            logger.debug({ userId }, 'TwitchChatProvider: Removing event listeners');
            // Remover listeners antes de desconectar para prevenir memory leaks
            this.eventListener.removeListeners(userId, client);

            logger.debug({ userId }, 'TwitchChatProvider: Disconnecting client');
            await this.connectionManager.disconnect(client);
            this.activeClients.delete(userId);
        } else {
            logger.debug({ userId }, 'TwitchChatProvider: No active client found');
        }

        logger.debug({ userId }, 'TwitchChatProvider: Stopping viewer polling');
        this.viewerPoller.stopPolling(userId);

        this.connectingUsers.delete(userId);

        logger.info({ userId }, 'TwitchChatProvider: Disconnect completed');
    }
}
