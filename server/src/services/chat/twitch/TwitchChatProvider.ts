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

        this.connectingUsers.add(userId);

        try {
            if (this.activeClients.has(userId)) {
                try {
                    logger.debug({ userId }, 'User already has an active Twitch client, refreshing state');
                    SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connected', 'Conectado');

                    const connection = await Connection.findOne({
                        where: { userId: String(userId), provider: 'twitch' }
                    });
                    if (connection?.providerUsername) {
                        const getAccessToken = async () => this.connectionService.getValidAccessToken(userId, 'twitch');
                        const validToken = await getAccessToken();
                        const accessToken = validToken || connection.accessToken;

                        this.viewerPoller.startPolling(userId, connection.providerUsername, accessToken, io);
                        if (connection.providerId) {
                            this.followerPoller.startPolling(userId, connection.providerId, getAccessToken, io);
                        }
                    }
                } catch (error) {
                    // Si falla el refresco de estado, SOLO logueamos y no matamos la conexión activa
                    logger.error({ err: error, userId }, 'Error refreshing Twitch state for active client');
                } finally {
                    // Asegurar limpieza de connectingUsers para este flujo
                    this.connectingUsers.delete(userId);
                }
                return;
            }

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'twitch', 'connecting', 'Buscando...');
            logger.info({ userId }, 'Connecting to Twitch chat');

            const client = await this.connectionManager.connect(userId);

            // Verificación de cancelación: ¿El usuario se desconectó mientras esperábamos?
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

            if (connection?.providerUsername) {
                const getAccessToken = async () => this.connectionService.getValidAccessToken(userId, 'twitch');
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

        try {
            const client = this.activeClients.get(userId);
            if (client) {
                logger.debug({ userId }, 'TwitchChatProvider: Removing event listeners');
                this.eventListener.removeListeners(userId, client);

                logger.debug({ userId }, 'TwitchChatProvider: Disconnecting client');
                await this.connectionManager.disconnect(client);
            } else {
                logger.debug({ userId }, 'TwitchChatProvider: No active client found');
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'TwitchChatProvider: Error during client disconnection');
        } finally {
            logger.debug({ userId }, 'TwitchChatProvider: Stopping polls');
            this.activeClients.delete(userId);
            this.viewerPoller.stopPolling(userId);
            this.followerPoller.stopPolling(userId);
            this.connectingUsers.delete(userId);

            logger.info({ userId }, 'TwitchChatProvider: Disconnect completed');
        }
    }
}
