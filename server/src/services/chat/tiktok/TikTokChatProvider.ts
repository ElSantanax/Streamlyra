/** Proveedor de chat de TikTok con discovery automático inicial y manual */

import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { ChatProvider } from '../shared/ChatProvider';
import { TikTokConnection } from '../../../types/tiktok.types';
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
    private static readonly AUTO_DISCOVERY_INTERVAL_MS = 15000;
    private static readonly RECONNECTION_DELAY_MS = 5000;

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
            this.emitCurrentConnectionStatus(userId, io);
            return;
        }

        this.stateManager.setConnecting(userId, true);

        try {
            const connection = await this.getConnection(userId);
            if (!connection || !connection.providerUsername) {
                logger.warn({ userId }, 'TikTok: No account connected in DB');
                this.stateManager.setConnecting(userId, false);
                return;
            }

            const username = this.normalizeUsername(connection.providerUsername);

            // 3. Limpiar cualquier rastro anterior antes de empezar de cero
            await this.clearInternalState(userId);

            // 4. Iniciar flujo de búsqueda automática
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting', 'Buscando...');
            await this.setupAutoDiscovery(userId, username, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'TikTok: Failed to setup connection flow');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', 'Error al iniciar conexión');
            this.stateManager.setConnecting(userId, false);
        }
    }

    async boostDiscovery(userId: string, io: Server): Promise<void> {
        if (this.stateManager.isConnecting(userId)) {
            logger.debug({ userId }, 'TikTok: Boost requested but already connecting/discovering');
            return;
        }

        logger.info({ userId }, 'TikTok: Manual boost requested');

        const connection = await this.getConnection(userId);
        if (!connection || !connection.providerUsername) return;

        const username = this.normalizeUsername(connection.providerUsername);

        this.stateManager.setManualMode(userId, true);
        this.stateManager.setConnecting(userId, true);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connecting', 'Buscando...');

        const flowId = this.generateFlowId();
        this.stateManager.setFlowId(userId, flowId);

        try {
            await this.attemptDiscovery(userId, username, flowId, io);
        } catch {
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'tiktok',
                'waiting_stream',
                'Live no detectado'
            );
        } finally {
            this.stateManager.setConnecting(userId, false);
        }
    }

    private async getConnection(userId: string): Promise<Connection | null> {
        return await Connection.findOne({
            where: { userId: String(userId), provider: 'tiktok' }
        });
    }

    private async setupAutoDiscovery(userId: string, username: string, io: Server): Promise<void> {
        const flowId = this.generateFlowId();
        this.stateManager.setFlowId(userId, flowId);

        const tryConnect = async () => {
            await this.attemptDiscovery(userId, username, flowId, io);
        };

        const cleanup = retryWithIntervalAndLimit(tryConnect, {
            intervalMs: TikTokChatProvider.AUTO_DISCOVERY_INTERVAL_MS,
            maxAttempts: TikTokChatProvider.MAX_AUTO_ATTEMPTS,
            onRetry: () => {
                const attempt = this.stateManager.getAutoAttempts(userId);
                logger.info({ userId, username, attempt }, `TikTok: Retrying discovery (${attempt}/${TikTokChatProvider.MAX_AUTO_ATTEMPTS})`);
            },
            onError: (err) => this.handleDiscoveryError(err, userId, username, io),
            onMaxAttemptsReached: () => this.handleAutoDiscoveryExhausted(userId, io)
        });

        this.stateManager.setDiscoveryCleanup(userId, cleanup);

        // Primer intento inmediato
        await tryConnect().catch(() => { });
    }

    private async attemptDiscovery(userId: string, username: string, flowId: string, io: Server): Promise<void> {
        // 1. Verificación inicial: ¿Este flujo sigue siendo el actual y válido?
        if (!this.isFlowValid(userId, flowId)) {
            logger.debug({ userId, username, flowId }, 'TikTok: Aborting stale discovery attempt');
            return;
        }

        logger.info({ userId, username, flowId }, 'TikTok: Attempting to connect to Live...');
        this.stateManager.incrementAutoAttempts(userId);

        const tiktokConnection = await this.connectionManager.connect(username);

        // 2. Verificación post-conexión: ¿El flujo o la cuenta cambiaron durante la espera?
        const isStillValid = await this.isConnectionStillValid(userId, flowId, username);

        if (!isStillValid) {
            logger.info({ userId, username, flowId }, 'TikTok: Flow invalidated during connection, aborting zombie');
            this.connectionManager.disconnect(tiktokConnection);
            return;
        }

        // Éxito y validación confirmada
        this.stateManager.setDiscoveryCleanup(userId, () => { });
        this.stateManager.setActiveConnection(userId, tiktokConnection);
        this.stateManager.setConnecting(userId, false);

        // No forzamos isLive: true, esperamos confirmación real del stream
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'connected', 'Conectado', this.eventListener.isStreamConfirmed(userId));
        this.eventListener.setupListeners(userId, tiktokConnection, io);
        this.setupDisconnectionHandler(userId, username, tiktokConnection, flowId, io);
    }

    private handleAutoDiscoveryExhausted(userId: string, io: Server): void {
        this.stateManager.setManualMode(userId, true);
        this.stateManager.setConnecting(userId, false);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'waiting_stream', 'Sin Live');
    }

    private handleDiscoveryError(err: unknown, userId: string, username: string, io: Server): void {
        const errorInfo = this.errorHandler.categorizeError(err, username);

        // Si es un error de "No Live", informar al cliente para que no se quede en "Buscando..."
        if (errorInfo.type === 'not_live') {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'waiting_stream', 'Sin Live');
        }

        if (errorInfo.isPermanent) {
            logger.error({ userId, username, type: errorInfo.type }, 'TikTok: Permanent error, stopping');
            this.stateManager.clearState(userId);
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', 'error', errorInfo.userMessage);
        }
    }

    private setupDisconnectionHandler(userId: string, username: string, connection: TikTokLiveConnection, flowId: string, io: Server): void {
        (connection as unknown as TikTokConnection).on('disconnected', async () => {
            if (this.stateManager.getFlowId(userId) !== flowId) {
                logger.debug({ userId, flowId }, 'TikTok: Ignoring disconnected zombie');
                return;
            }

            logger.info({ userId }, 'TikTok: Connection lost');
            this.stateManager.removeActiveConnection(userId);

            const connection = await this.getConnection(userId);
            if (connection) {
                const currentUsername = this.normalizeUsername(connection.providerUsername);
                if (currentUsername === username) {
                    setTimeout(() => this.connect(userId, io), TikTokChatProvider.RECONNECTION_DELAY_MS);
                }
            }
        });
    }

    async disconnect(userId: string): Promise<void> {
        logger.info({ userId }, 'TikTok: Force disconnect requested');
        await this.clearInternalState(userId);
    }

    /**
     * Normaliza el username removiendo @ iniciales
     */
    private normalizeUsername(username: string): string {
        return username.replace(/^@+/, '');
    }

    /**
     * Genera un ID único para el flujo de conexión
     */
    private generateFlowId(): string {
        return Math.random().toString(36).substring(7);
    }

    /**
     * Determina el estado de conexión actual basado en stream confirmation
     */
    private getCurrentConnectionStatus(userId: string): {
        status: 'connected' | 'waiting_stream';
        message: string | undefined;
        isLive: boolean;
    } {
        const isLive = this.eventListener.isStreamConfirmed(userId);
        const status = isLive ? 'connected' : 'waiting_stream';
        const message = status === 'waiting_stream' ? 'Sin Live' : undefined;

        return { status, message, isLive };
    }

    /**
     * Valida si el flujo de conexión sigue siendo válido
     */
    private isFlowValid(userId: string, flowId: string): boolean {
        return this.stateManager.hasState(userId) &&
            this.stateManager.getFlowId(userId) === flowId;
    }

    /**
     * Valida si la conexión post-establecimiento sigue siendo válida
     */
    private async isConnectionStillValid(
        userId: string,
        flowId: string,
        expectedUsername: string
    ): Promise<boolean> {
        const currentConnection = await this.getConnection(userId);
        const currentBoundUsername = currentConnection?.providerUsername
            ? this.normalizeUsername(currentConnection.providerUsername)
            : null;

        return this.isFlowValid(userId, flowId) &&
            currentBoundUsername === expectedUsername;
    }

    /**
     * Emite el estado de conexión actual al cliente
     */
    private emitCurrentConnectionStatus(userId: string, io: Server): void {
        const { status, message, isLive } = this.getCurrentConnectionStatus(userId);
        SafeSocketEmitter.emitConnectionStatus(io, userId, 'tiktok', status, message, isLive);
    }

    private async clearInternalState(userId: string): Promise<void> {
        try {
            const active = this.stateManager.getActiveConnection(userId);
            if (active) {
                active.removeAllListeners();
                this.connectionManager.disconnect(active);
            }
        } catch (error) {
            logger.error({ err: error, userId }, 'TikTok: Error during client disconnection');
        } finally {
            this.stateManager.clearState(userId);
            this.eventListener.clearStreamConfirmation(userId);
        }
    }
}
