/**
 * Proveedor de Chat de YouTube
 * Responsabilidad: Orquestar conexión a chat de YouTube
 */

import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { YouTubeBroadcastDiscovery } from './youtube/YouTubeBroadcastDiscovery';
import { YouTubeChatPoller } from './youtube/YouTubeChatPoller';
import { YouTubeViewerPoller } from './youtube/YouTubeViewerPoller';
import { SocketEventEmitter } from '../../utils/SocketEventEmitter';
import { Connection } from '../../models/Connection.model';
import { ConnectionService } from '../connection/ConnectionService';
import { retryWithInterval } from '../../utils/retryWithInterval';
import { logger } from '../../utils/logger';

export class YouTubeChatProvider implements ChatProvider {
    private discoveryCleanup: Map<string, () => void> = new Map();
    private broadcastDiscovery: YouTubeBroadcastDiscovery;
    private chatPoller: YouTubeChatPoller;
    private viewerPoller: YouTubeViewerPoller;

    constructor(private connectionService: ConnectionService) {
        this.broadcastDiscovery = new YouTubeBroadcastDiscovery();
        this.chatPoller = new YouTubeChatPoller();
        this.viewerPoller = new YouTubeViewerPoller();
    }

    private connectingUsers: Set<string> = new Set();

    async connect(userId: string, io: Server): Promise<void> {
        if (this.connectingUsers.has(userId)) {
            logger.debug({ userId }, 'Already connecting to YouTube, skipping...');
            return;
        }

        this.connectingUsers.add(userId);

        const startConnection = async () => {
            try {
                const connection = await Connection.findOne({
                    where: { userId: String(userId), provider: 'youtube' }
                });

                if (!connection) return;

                await this.disconnect(userId);

                SocketEventEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting');

                const tryConnect = async () => {
                    logger.debug({ userId }, 'YouTube discovery attempt...');
                    const stillExists = await Connection.findOne({
                        where: { userId: String(userId), provider: 'youtube' }
                    });
                    if (!stillExists) {
                        this.stopDiscovery(userId);
                        return;
                    }

                    const accessToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
                    if (!accessToken) {
                        // Si no hay token, no tiene sentido reintentar infinitamente sin renovarlo, 
                        // pero la logica de renovacion esta en getValidAccessToken.
                        // Si falla, quizas debamos pausar el polling. Por ahora lo dejamos.
                        return;
                    }

                    const broadcast = await this.broadcastDiscovery.findLiveBroadcast(accessToken);
                    if (!broadcast) {
                        throw new Error('No broadcast found');
                    }

                    const liveChatId = broadcast.snippet?.liveChatId;
                    const broadcastId = broadcast.id;

                    if (liveChatId) {
                        logger.info({ liveChatId, userId }, 'YouTube live detected');
                        this.stopDiscovery(userId); // Detener polling de descubrimiento

                        SocketEventEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');

                        this.chatPoller.startPolling(userId, liveChatId, accessToken, io);
                        if (broadcastId) {
                            this.viewerPoller.startPolling(userId, broadcastId, accessToken, io);
                        }
                    }
                };

                // Configurar el polling para reintentos (cada 60s)
                const cleanup = retryWithInterval(tryConnect, {
                    intervalMs: 60000,
                    onError: (err) => {
                        logger.debug({ userId, err }, 'YouTube discovery retry failed');
                    }
                });

                this.discoveryCleanup.set(userId, cleanup);

                // Ejecutar inmediatamente el primer intento
                await tryConnect().catch((err) => {
                    logger.debug({ userId, err }, 'Initial YouTube connection attempt failed - continuing in background');
                    // No cambiamos estado a error aquí, dejamos que siga "connecting"
                });

            } catch (error) {
                logger.error({ err: error, userId }, 'Error setting up YouTube connection');
                SocketEventEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Error de configuración');
            } finally {
                this.connectingUsers.delete(userId);
            }
        };

        void startConnection();
    }

    private stopDiscovery(userId: string) {
        const cleanup = this.discoveryCleanup.get(userId);
        if (cleanup) {
            cleanup();
            this.discoveryCleanup.delete(userId);
        }
    }

    async disconnect(userId: string): Promise<void> {
        this.stopDiscovery(userId);
        this.chatPoller.stopPolling(userId);
        this.viewerPoller.stopPolling(userId);
    }
}
