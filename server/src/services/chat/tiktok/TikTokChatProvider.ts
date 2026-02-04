/** Proveedor de chat de TikTok con discovery automático inicial y manual */

import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ChatProvider } from '../shared/ChatProvider';
import { TikTokConnectionManager } from './TikTokConnectionManager';
import { TikTokEventListener } from './TikTokEventListener';
import { TikTokEventTransformer } from '../transformers/TikTokEventTransformer';
import { TikTokConnectionStateManager } from './TikTokConnectionStateManager';
import { TikTokErrorHandler } from './TikTokErrorHandler';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { Connection } from '../../../models/Connection.model';
import { retryWithIntervalAndLimit } from '../../../utils/retryWithInterval';
import { logger } from '../../../utils/logger';

export class TikTokChatProvider implements ChatProvider {
    private readonly stateManager: TikTokConnectionStateManager;
    private readonly connectionManager: TikTokConnectionManager;
    private readonly eventListener: TikTokEventListener;
    private readonly errorHandler: TikTokErrorHandler;
    private static readonly MAX_AUTO_ATTEMPTS = 12;

    constructor() {
        const transformer = new TikTokEventTransformer();
        this.connectionManager = new TikTokConnectionManager();
        this.eventListener = new TikTokEventListener(transformer);
        this.errorHandler = new TikTokErrorHandler();
        this.stateManager = new TikTokConnectionStateManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        // 1. Evitar ráfagas de conexión
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'TikTok: Connection already in progress, skipping');
            return;
        }

        // 2. Si ya hay una conexión activa, solo informar estado
        if (this.stateManager.hasActiveConnection(userId)) {
            const status = this.eventListener.isStreamConfirmed(userId) ? 'connected' : 'waiting_stream';
            const msg = status === 'waiting_stream' ? 'Sin Live' : undefined;
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', status, msg);
            return;
        }

        this.stateManager.setConnecting(userId, true);

        try {
            const connection = await this.getConnection(userId);
            if (!connection || !connection.providerUsername) {
                logger.warn({ userId }, 'TikTok: No account connected in DB');
                return;
            }

            const username = connection.providerUsername.replace(/^@+/, '');

            // 3. Limpiar cualquier rastro anterior antes de empezar de cero
            await this.clearInternalState(userId);

            // 4. Iniciar flujo de búsqueda automática
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting', 'Buscando...');
            await this.setupAutoDiscovery(userId, username, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'TikTok: Failed to setup connection flow');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', 'Error al iniciar conexión');
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }

    async boostDiscovery(userId: string, io: Server): Promise<void> {
        logger.info({ userId }, 'TikTok: Manual boost requested');

        const connection = await this.getConnection(userId);
        if (!connection || !connection.providerUsername) return;

        const username = connection.providerUsername.replace(/^@+/, '');

        this.stateManager.setManualMode(userId, true);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting', 'Buscando...');

        try {
            await this.attemptDiscovery(userId, username, io);
        } catch {
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'tiktok',
                'waiting_stream',
                'Live no detectado'
            );
        }
    }

    private async getConnection(userId: string): Promise<Connection | null> {
        return await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });
    }

    private async setupAutoDiscovery(userId: string, username: string, io: Server): Promise<void> {
        const tryConnect = async () => {
            if (this.stateManager.getAutoAttempts(userId) >= TikTokChatProvider.MAX_AUTO_ATTEMPTS) {
                this.handleAutoDiscoveryExhausted(userId, io);
                return;
            }
            await this.attemptDiscovery(userId, username, io);
        };

        const cleanup = retryWithIntervalAndLimit(tryConnect, {
            intervalMs: 15000, // Cada 15s para ser más gentiles con el rate limit
            maxAttempts: TikTokChatProvider.MAX_AUTO_ATTEMPTS,
            onRetry: () => {
                const attempt = this.stateManager.getAutoAttempts(userId);
                logger.info({ userId, username, attempt }, `TikTok: Retrying discovery (${attempt}/${TikTokChatProvider.MAX_AUTO_ATTEMPTS})`);
            },
            onError: (err) => this.handleDiscoveryError(err, userId, username, io),
            onMaxAttemptsReached: () => this.handleAutoDiscoveryExhausted(userId, io)
        });

        this.stateManager.setDiscoveryCleanup(userId, cleanup);
    }

    private async attemptDiscovery(userId: string, username: string, io: Server): Promise<void> {
        logger.info({ userId, username }, 'TikTok: Attempting to connect to Live...');

        this.stateManager.incrementAutoAttempts(userId);

        const tiktokConnection = await this.connectionManager.connect(username);

        // Exito: Limpiar discovery y configurar chat
        this.stateManager.setDiscoveryCleanup(userId, () => { }); // Eliminar reintentos
        this.stateManager.setActiveConnection(userId, tiktokConnection);

        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', 'Conectado');
        this.eventListener.setupListeners(userId, tiktokConnection, io);

        this.setupDisconnectionHandler(userId, tiktokConnection, io);
    }

    private handleAutoDiscoveryExhausted(userId: string, io: Server): void {
        this.stateManager.setManualMode(userId, true);
        SafeSocketEmitter.emitConnectionStatus(
            io,
            userId,
            'tiktok',
            'waiting_stream',
            'Sin Live'
        );
    }

    private handleDiscoveryError(err: unknown, userId: string, username: string, io: Server): void {
        const errorInfo = this.errorHandler.categorizeError(err, username);

        if (errorInfo.isPermanent) {
            logger.error({ userId, username, type: errorInfo.type }, 'TikTok: Permanent error, stopping');
            this.stateManager.clearState(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', errorInfo.userMessage);
        }
    }

    private setupDisconnectionHandler(userId: string, connection: TikTokLiveConnection, io: Server): void {
        // @ts-expect-error - Evento no tipado en la librería pero existente
        connection.on('disconnected', async () => {
            logger.info({ userId }, 'TikTok: Connection lost');
            this.stateManager.removeActiveConnection(userId);

            // Si el usuario sigue teniendo la cuenta vinculada, intentar reconectar
            const conn = await this.getConnection(userId);
            if (conn) {
                setTimeout(() => this.connect(userId, io), 5000);
            }
        });
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTok: Force disconnect requested');
        await this.clearInternalState(userId);
    }

    private async clearInternalState(userId: string): Promise<void> {
        const active = this.stateManager.getActiveConnection(userId);
        if (active) {
            active.removeAllListeners();
            await this.connectionManager.disconnect(active);
        }
        this.stateManager.clearState(userId);
        this.eventListener.clearStreamConfirmation(userId);
    }
}
