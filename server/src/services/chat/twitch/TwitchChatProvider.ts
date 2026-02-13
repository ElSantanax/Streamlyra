/** Proveedor de chat de Twitch basado en Webhooks (EventSub) con respaldo IRC para mensajes */

import tmi from 'tmi.js';
import { Server } from 'socket.io';
import { ChatProvider } from '../shared/ChatProvider';
import { TwitchConnectionManager } from './TwitchConnectionManager';
import { TwitchEventListener } from './TwitchEventListener';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { ConnectionService } from '../../connection/ConnectionService';
import { logger } from '../../../utils/logger';
import { TwitchManager } from './TwitchManager';

export class TwitchChatProvider implements ChatProvider {
    private activeClients: Map<string, tmi.Client> = new Map();
    private connectingUsers: Set<string> = new Set();
    private transformer: TwitchEventTransformer;
    private connectionManager: TwitchConnectionManager;
    private eventListener: TwitchEventListener;
    private twitchManager: TwitchManager;

    constructor(private connectionService: ConnectionService) {
        this.transformer = new TwitchEventTransformer();
        this.connectionManager = new TwitchConnectionManager(connectionService);
        this.eventListener = new TwitchEventListener(this.transformer);
        this.twitchManager = new TwitchManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to Twitch, skipping...');
            return;
        }

        this.connectingUsers.add(userId);

        try {
            if (this.activeClients.has(userId)) {
                try {
                    logger.debug({ userId }, 'User already has an active Twitch client, refreshing state');
                    SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected', 'Conectado');

                    const connection = await Connection.findOne({
                        where: { userId: String(userId), provider: 'twitch' }
                    });

                    if (connection?.providerId) {
                        void this.twitchManager.registerWebhooks(userId, connection.providerId);
                    }
                } catch (error) {
                    logger.error({ err: error, userId }, 'Error refreshing Twitch state for active client');
                } finally {
                    this.connectingUsers.delete(userId);
                }
                return;
            }

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connecting', 'Buscando...');
            logger.info({ userId }, 'Connecting to Twitch chat');

            const client = await this.connectionManager.connect(userId);

            if (!this.connectingUsers.has(userId)) {
                logger.info({ userId }, 'Twitch: Connection established but no longer needed, disconnecting...');
                await this.connectionManager.disconnect(client);
                return;
            }

            this.activeClients.set(userId, client);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected', 'Conectado');
            this.eventListener.setupListeners(userId, client, io);

            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'twitch' }
            });

            if (connection?.providerId) {
                void this.twitchManager.registerWebhooks(userId, connection.providerId);
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

        try {
            const client = this.activeClients.get(userId);
            if (client) {
                this.eventListener.removeListeners(userId, client);
                await this.connectionManager.disconnect(client);
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'TwitchChatProvider: Error during client disconnection');
        } finally {
            this.activeClients.delete(userId);
            this.connectingUsers.delete(userId);
            logger.info({ userId }, 'TwitchChatProvider: Disconnect completed');
        }
    }
}
