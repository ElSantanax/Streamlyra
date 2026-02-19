import { Server } from 'socket.io';
import { Op } from 'sequelize';
import { ChatProvider } from '../shared/ChatProvider';
import { YouTubeConnectionStateManager } from './YouTubeConnectionStateManager';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { ConnectionService } from '../../connection/ConnectionService';
import { logger } from '../../../utils/logger';
import { youtubePubSubService } from './YouTubePubSubService';
import { YouTubeStreamContext } from '../../../models/YouTubeStreamContext.model';
import { YouTubeDiscoveryLoop } from './YouTubeDiscoveryLoop';
import { YouTubeBroadcast } from '../../../types/youtube.types';
import { WebhookCache } from '../../webhook/WebhookCache';

export class YouTubeChatProvider implements ChatProvider {
    private stateManager: YouTubeConnectionStateManager;
    private discoveryLoop: YouTubeDiscoveryLoop;

    constructor(private connectionService: ConnectionService) {
        this.stateManager = new YouTubeConnectionStateManager(connectionService);
        this.discoveryLoop = new YouTubeDiscoveryLoop(
            this.stateManager,
            connectionService,
            this.handleBroadcastFound.bind(this)
        );
    }

    async connect(userId: string, io: Server): Promise<void> {
        if (this.stateManager.hasActiveConnection(userId)) {
            this.notifyStatus(io, userId, 'connected', 'Conectado', true);
            return;
        }

        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'YouTube: Connection already in progress, skipping');
            return;
        }

        this.stateManager.clearState(userId);

        const account = await this.prepareDiscovery(userId, io);
        if (!account) return;

        try {
            void youtubePubSubService.subscribe(userId, account.providerId)
                .catch(err => logger.error({ err, userId }, 'Error subscribing to YouTube PubSub'));

            void this.discoveryLoop.startAutoDiscovery(userId, account, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'YouTube: Failed to setup connection sequence');
            this.notifyStatus(io, userId, 'error', 'Error de configuración');
            this.stateManager.setConnecting(userId, false);
        }
    }

    async boostDiscovery(userId: string, io: Server, forceRefresh: boolean = false): Promise<void> {
        // Si no es forzado y ya estamos conectados, ignorar para ahorrar cuota
        if (!forceRefresh && this.stateManager.hasActiveConnection(userId)) {
            logger.debug({ userId }, 'YouTube: Already connected, skipping automatic discovery boost');
            return;
        }

        const account = await this.prepareDiscovery(userId, io);
        if (!account) return;

        this.stateManager.setManualMode(userId, true);
        logger.info({ userId, forceRefresh }, 'YouTube: Webhook/Manual boost initiated');

        try {
            // Si es un refresco forzado, limpiamos el estado previo para evitar duplicados de pollers
            if (forceRefresh) {
                this.stateManager.clearState(userId);
                // Necesitamos re-activar el estado de "conectando" tras el clearState
                this.stateManager.setConnecting(userId, true);
            }

            // Asegurar suscripción a PubSub también en modo boost si no se hizo antes
            void youtubePubSubService.subscribe(userId, account.providerId).catch(() => { });

            await this.discoveryLoop.performManualDiscovery(userId, account, io);
        } catch {
            // Ignorar error aquí, ya se maneja en discoveryLoop o se propaga si es necesario
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }

    private async prepareDiscovery(userId: string, io: Server): Promise<{ providerId: string } | null> {
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'YouTube: Discovery already in progress, skipping');
            return null;
        }

        const account = await this.connectionService.getAccount(userId, 'youtube');
        if (!account) {
            logger.warn({ userId }, 'YouTube: No account found for discovery');
            this.notifyStatus(io, userId, 'error', 'Cuenta no vinculada');
            return null;
        }

        this.stateManager.setConnecting(userId, true);
        this.notifyStatus(io, userId, 'connecting', 'Buscando...');

        return account;
    }

    private async handleBroadcastFound(
        userId: string,
        broadcast: YouTubeBroadcast,
        io: Server
    ): Promise<void> {
        const liveChatId = broadcast.snippet.liveChatId;
        const broadcastId = broadcast.id;
        const channelId = broadcast.snippet.channelId;

        if (!liveChatId) return;

        logger.info({ userId, liveChatId }, 'YouTube: Active broadcast discovered');

        // Persistir contexto en DB para habilitar Cache-First (Costo 0 de cuota en futuras búsquedas)
        if (broadcastId && channelId) {
            try {
                // 1. Limpiar otros contextos activos antiguos para este canal (KISS: solo uno puede estar activo)
                await YouTubeStreamContext.update(
                    { isActive: false, endedAt: new Date() },
                    {
                        where: {
                            channelId,
                            videoId: { [Op.ne]: broadcastId },
                            isActive: true
                        }
                    }
                );

                // 2. Upsert del contexto actual
                await YouTubeStreamContext.upsert({
                    channelId,
                    videoId: broadcastId,
                    liveChatId,
                    isActive: true,
                    startedAt: new Date()
                });

                logger.debug({ channelId, videoId: broadcastId }, 'YouTube: Stream context persisted to DB');
            } catch (err) {
                logger.warn({ err }, 'Failed to persist YouTube stream context to DB');
            }
        }

        this.stateManager.setDiscoveryCleanup(userId, () => { });
        await this.connectionService.updateChatroomId(userId, 'youtube', liveChatId)
            .catch(err => logger.error({ err, userId }, 'Failed to persist YouTube chatroomId'));

        this.stateManager.markAsConnected(userId);
        this.stateManager.setConnecting(userId, false);

        this.notifyStatus(io, userId, 'connected', 'Conectado', true);

        this.initializePollingServices(userId, liveChatId, broadcastId, io);
    }

    private initializePollingServices(
        userId: string,
        liveChatId: string,
        broadcastId: string | undefined,
        io: Server
    ): void {
        const onFatalError = () => {
            logger.info({ userId }, 'YouTube: Fatal error detected in poller, cleaning up state');
            this.stateManager.clearState(userId);
        };

        this.stateManager.getChatPoller(userId).startPolling(userId, liveChatId, io, onFatalError);
        if (broadcastId) {
            this.stateManager.getViewerPoller(userId).startPolling(userId, broadcastId, io, onFatalError);
        }
    }

    private notifyStatus(io: Server, userId: string, status: 'connecting' | 'waiting_stream' | 'connected' | 'disconnected' | 'error', message: string, isLive: boolean = false): void {
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', status, message, isLive);
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'YouTube: Disconnecting and cleaning state');
        try {
            this.stateManager.clearState(userId);
        } catch (error) {
            logger.error({ err: error, userId }, 'YouTube: Error during disconnection');
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }

    async onAccountDeleted(userId: string): Promise<void> {
        logger.info({ userId }, 'YouTube: Permanent account deletion cleanup');
        try {
            await this.disconnect(userId);

            const account = await this.connectionService.getAccount(userId, 'youtube');
            if (account) {
                const channelId = account.providerId;

                // 1. Cancelar suscripción a PubSubHubbub
                await youtubePubSubService.unsubscribe(userId, channelId)
                    .catch((e: unknown) => logger.error({ err: e, channelId }, 'Failed to unsubscribe from YouTube PubSub during deletion'));

                // 2. Limpiar caché de conexiones para el webhook
                WebhookCache.getInstance().invalidate(WebhookCache.keys.connection('youtube', channelId));

                await YouTubeStreamContext.destroy({
                    where: { channelId }
                }).catch((e: unknown) => logger.error({ err: e, channelId }, 'Failed to delete stream context during deletion'));

                logger.info({ userId, channelId }, 'YouTube: Permanent cleanup completed');
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'YouTube: Error during permanent deletion cleanup');
        }
    }
}