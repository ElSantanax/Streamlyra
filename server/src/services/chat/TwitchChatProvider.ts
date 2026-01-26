import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { TwitchConnectionManager } from './twitch/TwitchConnectionManager';
import { TwitchEventListener } from './twitch/TwitchEventListener';
import { TwitchViewerPoller } from './twitch/TwitchViewerPoller';
import { TwitchEventTransformer } from './transformers/TwitchEventTransformer';
import { SocketEventEmitter } from '../../utils/SocketEventEmitter';
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

        this.connectingUsers.add(userId);

        const startConnection = async () => {
            try {
                if (this.activeClients.has(userId)) {
                    logger.debug({ userId }, 'User already has an active Twitch client, disconnecting first');
                    await this.disconnect(userId);
                }

                SocketEventEmitter.emitConnectionStatus(io, userId, 'twitch', 'connecting');
                logger.info({ userId }, 'Connecting to Twitch chat');

                const client = await this.connectionManager.connect(userId);
                this.activeClients.set(userId, client);

                SocketEventEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected');

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
                SocketEventEmitter.emitConnectionStatus(io, userId, 'twitch', 'error');
            } finally {
                this.connectingUsers.delete(userId);
            }
        };

        void startConnection();
    }

    async disconnect(userId: string): Promise<void> {
        const client = this.activeClients.get(userId);
        if (client) {
            await this.connectionManager.disconnect(client);
            this.activeClients.delete(userId);
        }
        this.viewerPoller.stopPolling(userId);
    }
}
