/**
 * Proveedor de Chat de YouTube
 * Responsabilidad: Orquestar conexión a chat de YouTube
 * 
 * GESTIÓN DE CUOTAS:
 * Este proveedor implementa protecciones automáticas para evitar desperdicio de cuotas:
 * 
 * 1. DISCOVERY TIMEOUT (2 horas):
 *    - Si no se encuentra un stream en vivo después de 2 horas, el discovery se detiene
 *    - Ahorra hasta 660 unidades por usuario que olvida la app abierta
 *    - El usuario recibe notificación para reconectar cuando vaya a streamear
 * 
 * 2. LÍMITE DE INTENTOS (60 intentos):
 *    - Máximo 60 intentos de discovery (con intervalo de 120s = 2 horas)
 *    - Consumo máximo: 60 unidades por sesión de discovery
 * 
 * 3. DETECCIÓN AUTOMÁTICA:
 *    - Cuando se encuentra un stream, el discovery se detiene inmediatamente
 *    - Solo se ejecuta chat/viewer polling cuando hay stream activo
 * 
 * FLUJO:
 * Usuario conecta → Discovery inicia → Busca stream cada 120s → 
 * Si encuentra: Inicia chat/viewer polling
 * Si no encuentra en 2h: Se detiene y notifica al usuario
 */

import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { YouTubeBroadcastDiscovery } from './youtube/YouTubeBroadcastDiscovery';
import { YouTubeChatPoller } from './youtube/YouTubeChatPoller';
import { YouTubeViewerPoller } from './youtube/YouTubeViewerPoller';
import { YouTubeDiscoveryManager } from './youtube/YouTubeDiscoveryManager';
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { Connection } from '../../models/Connection.model';
import { ConnectionService } from '../connection/ConnectionService';
import { retryWithInterval } from '../../utils/retryWithInterval';
import { logger } from '../../utils/logger';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';

export class YouTubeChatProvider implements ChatProvider {
    private broadcastDiscovery: YouTubeBroadcastDiscovery;
    private chatPoller: YouTubeChatPoller;
    private viewerPoller: YouTubeViewerPoller;
    private discoveryManager: YouTubeDiscoveryManager;

    constructor(private connectionService: ConnectionService) {
        this.broadcastDiscovery = new YouTubeBroadcastDiscovery();
        this.chatPoller = new YouTubeChatPoller();
        this.viewerPoller = new YouTubeViewerPoller();
        this.discoveryManager = new YouTubeDiscoveryManager();
    }

    async connect(userId: string, io: Server): Promise<void> {
        // Verificar si ya está conectándose
        if (this.discoveryManager.isConnecting(userId)) {
            logger.debug({ userId }, 'Already connecting to YouTube, skipping...');
            return;
        }

        // Si ya hay un discovery activo, solo emitir estado conectado
        if (this.discoveryManager.hasActiveDiscovery(userId)) {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');
            return;
        }

        this.discoveryManager.markAsConnecting(userId);

        try {
            const connection = await this.getConnection(userId);
            if (!connection) {
                return;
            }

            // Solo desconectar si realmente vamos a iniciar uno nuevo
            await this.disconnect(userId);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting');

            // Configurar y registrar el discovery
            await this.setupDiscovery(userId, io);

        } catch (error) {
            logger.error({ err: error, userId }, 'Error setting up YouTube connection');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Error de configuración');
        } finally {
            this.discoveryManager.unmarkAsConnecting(userId);
        }
    }

    /**
     * Obtiene la conexión de YouTube del usuario
     */
    private async getConnection(userId: string): Promise<any> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'youtube' }
        });

        if (!connection) {
            this.discoveryManager.unmarkAsConnecting(userId);
        }

        return connection;
    }

    /**
     * Configura el proceso de discovery para buscar broadcasts en vivo
     */
    private async setupDiscovery(userId: string, io: Server): Promise<void> {
        const tryConnect = async () => {
            await this.attemptDiscovery(userId, io);
        };

        // Configurar el polling para reintentos usando configuración centralizada
        const cleanup = retryWithInterval(tryConnect, {
            intervalMs: YouTubePollingConfig.DISCOVERY_POLLING_INTERVAL,
            onError: (err) => this.handleDiscoveryError(err, userId, io)
        });

        this.discoveryManager.registerDiscovery(userId, cleanup);

        // Ejecutar inmediatamente el primer intento
        await tryConnect().catch((err) => {
            logger.debug({ userId, err }, 'Initial YouTube connection attempt failed - continuing in background');
        });
    }

    /**
     * Intenta descubrir un broadcast en vivo
     */
    private async attemptDiscovery(userId: string, io: Server): Promise<void> {
        // Verificar límites de discovery antes de cada intento
        if (!this.discoveryManager.shouldContinueDiscovery(userId, io)) {
            return;
        }

        logger.debug({ userId }, 'YouTube discovery attempt...');

        // Verificar que la conexión aún existe
        const stillExists = await Connection.findOne({
            where: { userId: String(userId), provider: 'youtube' }
        });
        if (!stillExists) {
            this.discoveryManager.stopDiscovery(userId);
            return;
        }

        // Obtener token válido
        const accessToken = await this.connectionService.getValidAccessToken(userId, 'youtube');
        if (!accessToken) {
            return;
        }

        // Incrementar contador de intentos
        const attempts = this.discoveryManager.incrementAttempts(userId);

        // Buscar broadcast en vivo
        const broadcast = await this.broadcastDiscovery.findLiveBroadcast(accessToken);
        if (!broadcast) {
            throw new Error('No broadcast found');
        }

        // Si se encuentra un broadcast, iniciar polling
        await this.handleBroadcastFound(userId, broadcast, accessToken, io, attempts);
    }

    /**
     * Maneja el caso cuando se encuentra un broadcast en vivo
     */
    private async handleBroadcastFound(
        userId: string,
        broadcast: any,
        accessToken: string,
        io: Server,
        attempts: number
    ): Promise<void> {
        const liveChatId = broadcast.snippet?.liveChatId;
        const broadcastId = broadcast.id;

        if (liveChatId) {
            logger.info({ liveChatId, userId, attempts }, 'YouTube live detected');

            // Detener discovery inmediatamente cuando se encuentra stream
            // Esto ahorra cuotas ya que no se necesita seguir buscando
            this.discoveryManager.stopDiscovery(userId);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');

            // Iniciar polling de chat y viewers solo cuando hay stream activo
            this.chatPoller.startPolling(userId, liveChatId, accessToken, io);
            if (broadcastId) {
                this.viewerPoller.startPolling(userId, broadcastId, accessToken, io);
            }
        }
    }

    /**
     * Maneja errores durante el discovery
     */
    private handleDiscoveryError(err: unknown, userId: string, io: Server): void {
        // Detectar error de cuota agotada y notificar al usuario
        if (err instanceof Error && err.message === 'YOUTUBE_QUOTA_EXCEEDED') {
            this.discoveryManager.notifyQuotaExceeded(io, userId);
        } else {
            logger.debug({ userId, err }, 'YouTube discovery retry failed');
        }
    }

    async disconnect(userId: string): Promise<void> {
        this.discoveryManager.stopDiscovery(userId);
        this.chatPoller.stopPolling(userId);
        this.viewerPoller.stopPolling(userId);
    }
}
