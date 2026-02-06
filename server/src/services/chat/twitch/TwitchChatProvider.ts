/** Proveedor de chat de Twitch con cliente tmi.js y polling de espectadores */

import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { ChatProvider } from '../shared/ChatProvider';
import { TwitchConnectionManager } from './TwitchConnectionManager';
import { TwitchEventListener } from './TwitchEventListener';
import { TwitchViewerPoller } from './TwitchViewerPoller';
import { TwitchFollowerPoller } from './TwitchFollowerPoller';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { ConnectionService } from '../../connection/ConnectionService';
import { logger } from '../../../utils/logger';

export class TwitchChatProvider implements ChatProvider {
    private activeClients: Map<string, tmi.Client> = new Map();
    private connectingUsers: Set<string> = new Set();
    private transformer: TwitchEventTransformer;
    private connectionManager: TwitchConnectionManager;
    private eventListener: TwitchEventListener;
    private viewerPoller: TwitchViewerPoller;
    private followerPoller: TwitchFollowerPoller;

    constructor(private connectionService: ConnectionService) {
        this.transformer = new TwitchEventTransformer();
        this.connectionManager = new TwitchConnectionManager(connectionService);
        this.eventListener = new TwitchEventListener(this.transformer);
        this.viewerPoller = new TwitchViewerPoller();
        this.followerPoller = new TwitchFollowerPoller();
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to Twitch, skipping...');
            return;
        }

        if (this.activeClients.has(userId)) {
            logger.debug({ userId }, 'User already has an active Twitch client, refreshing state');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected', 'Conectado');

            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'twitch' }
            });
            if (connection?.providerUsername) {
                // Función auxiliar para obtener token actualizado
                const getAccessToken = async () => this.connectionService.getValidAccessToken(userId, 'twitch');

                // Inicializar polling con token actual
                const validToken = await getAccessToken();
                const accessToken = validToken || connection.accessToken;

                this.viewerPoller.startPolling(userId, connection.providerUsername, accessToken, io);
                if (connection.providerId) {
                    this.followerPoller.startPolling(userId, connection.providerId, getAccessToken, io);
                }
            }
            return;
        }

        this.connectingUsers.add(userId);

        try {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connecting', 'Buscando...');
            logger.info({ userId }, 'Connecting to Twitch chat');

            const client = await this.connectionManager.connect(userId);
            this.activeClients.set(userId, client);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected', 'Conectado');

            this.eventListener.setupListeners(userId, client, io);

            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'twitch' }
            });

            if (connection?.providerUsername) {
                // Función auxiliar para obtener token actualizado
                const getAccessToken = async () => this.connectionService.getValidAccessToken(userId, 'twitch');

                // Inicializar polling con token actual
                const validToken = await getAccessToken();
                const accessToken = validToken || connection.accessToken;

                this.viewerPoller.startPolling(userId, connection.providerUsername, accessToken, io);
                if (connection.providerId) {
                    this.followerPoller.startPolling(userId, connection.providerId, getAccessToken, io);
                }
            }

        } catch (error) {
            logger.error({ err: error, userId }, 'Error connecting to Twitch');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'error', 'Error sesión');
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
            this.eventListener.removeListeners(userId, client);

            logger.debug({ userId }, 'TwitchChatProvider: Disconnecting client');
            await this.connectionManager.disconnect(client);
            this.activeClients.delete(userId);
        } else {
            logger.debug({ userId }, 'TwitchChatProvider: No active client found');
        }

        logger.debug({ userId }, 'TwitchChatProvider: Stopping polls');
        this.viewerPoller.stopPolling(userId);
        this.followerPoller.stopPolling(userId);

        this.connectingUsers.delete(userId);

        logger.info({ userId }, 'TwitchChatProvider: Disconnect completed');
    }
}
