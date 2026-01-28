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
import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { Connection } from '../../models/Connection.model';
import { ConnectionService } from '../connection/ConnectionService';
import { retryWithInterval } from '../../utils/retryWithInterval';
import { logger } from '../../utils/logger';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';

export class YouTubeChatProvider implements ChatProvider {
    private discoveryCleanup: Map<string, () => void> = new Map();
    private discoveryStartTime: Map<string, number> = new Map();
    private discoveryAttempts: Map<string, number> = new Map();
    private broadcastDiscovery: YouTubeBroadcastDiscovery;
    private chatPoller: YouTubeChatPoller;
    private viewerPoller: YouTubeViewerPoller;

    // Configuración de límites para evitar desperdicio de cuotas
    // Si el usuario deja la app abierta sin estar en vivo, el discovery se detiene
    // después de estos límites para ahorrar cuotas de la API de YouTube
    private readonly MAX_DISCOVERY_TIME_MS = 2 * 60 * 60 * 1000; // 2 horas
    private readonly MAX_DISCOVERY_ATTEMPTS = 60; // 60 intentos (2 horas con intervalo de 120s)

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

        // Si ya hay una limpieza registrada, significa que estamos monitoreando
        if (this.discoveryCleanup.has(userId)) {
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');
            return;
        }

        this.connectingUsers.add(userId);

        try {
            const connection = await Connection.findOne({
                where: { userId: String(userId), provider: 'youtube' }
            });

            if (!connection) {
                this.connectingUsers.delete(userId);
                return;
            }

            // Solo desconectar si realmente vamos a iniciar uno nuevo
            await this.disconnect(userId);

            // Inicializar contadores para tracking de discovery
            // Esto permite detener el discovery después de cierto tiempo/intentos
            // para evitar desperdicio de cuotas si el usuario no está en vivo
            this.discoveryStartTime.set(userId, Date.now());
            this.discoveryAttempts.set(userId, 0);

            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connecting');

            const tryConnect = async () => {
                // Verificar límites de discovery antes de cada intento
                // Si se exceden los límites, se detiene automáticamente
                if (!this.shouldContinueDiscovery(userId, io)) {
                    return;
                }

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
                    return;
                }

                // Incrementar contador de intentos para tracking
                const attempts = (this.discoveryAttempts.get(userId) || 0) + 1;
                this.discoveryAttempts.set(userId, attempts);

                const broadcast = await this.broadcastDiscovery.findLiveBroadcast(accessToken);
                if (!broadcast) {
                    throw new Error('No broadcast found');
                }

                const liveChatId = broadcast.snippet?.liveChatId;
                const broadcastId = broadcast.id;

                if (liveChatId) {
                    logger.info({ liveChatId, userId, attempts }, 'YouTube live detected');

                    // Detener discovery inmediatamente cuando se encuentra stream
                    // Esto ahorra cuotas ya que no se necesita seguir buscando
                    this.stopDiscovery(userId);

                    SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'connected');

                    // Iniciar polling de chat y viewers solo cuando hay stream activo
                    this.chatPoller.startPolling(userId, liveChatId, accessToken, io);
                    if (broadcastId) {
                        this.viewerPoller.startPolling(userId, broadcastId, accessToken, io);
                    }
                }
            };

            // Configurar el polling para reintentos usando configuración centralizada
            const cleanup = retryWithInterval(tryConnect, {
                intervalMs: YouTubePollingConfig.DISCOVERY_POLLING_INTERVAL,
                onError: (err) => {
                    // Detectar error de cuota agotada y notificar al usuario
                    if (err instanceof Error && err.message === 'YOUTUBE_QUOTA_EXCEEDED') {
                        logger.warn(
                            { userId },
                            '⚠️  YouTube quota exceeded - Stopping discovery and notifying user'
                        );
                        this.stopDiscovery(userId);
                        SafeSocketEmitter.emitConnectionStatus(
                            io,
                            userId,
                            'youtube',
                            'error',
                            '⚠️ Cuota de YouTube agotada. Por favor, espera hasta mañana para que se renueve la cuota diaria.'
                        );
                    } else {
                        logger.debug({ userId, err }, 'YouTube discovery retry failed');
                    }
                }
            });

            this.discoveryCleanup.set(userId, cleanup);

            // Ejecutar inmediatamente el primer intento
            await tryConnect().catch((err) => {
                logger.debug({ userId, err }, 'Initial YouTube connection attempt failed - continuing in background');
            });

        } catch (error) {
            logger.error({ err: error, userId }, 'Error setting up YouTube connection');
            SafeSocketEmitter.emitConnectionStatus(io, userId, 'youtube', 'error', 'Error de configuración');
        } finally {
            this.connectingUsers.delete(userId);
        }
    }

    /**
     * Verifica si debe continuar el discovery para evitar desperdicio de cuotas
     * 
     * PROTECCIÓN AUTOMÁTICA:
     * Detiene el discovery si se cumple alguna de estas condiciones:
     * 1. Ha pasado más de 2 horas sin encontrar stream (MAX_DISCOVERY_TIME_MS)
     * 2. Se han hecho más de 60 intentos (MAX_DISCOVERY_ATTEMPTS)
     * 
     * AHORRO DE CUOTAS:
     * Sin esta protección, un usuario que olvida la app abierta 24 horas consumiría:
     * - 24 horas × 30 unidades/hora = 720 unidades desperdiciadas
     * 
     * Con esta protección:
     * - 2 horas × 30 unidades/hora = 60 unidades (ahorro de 660 unidades)
     * 
     * @param userId - ID del usuario
     * @param io - Instancia de Socket.IO para notificar al usuario
     * @returns true si debe continuar, false si debe detenerse
     */
    private shouldContinueDiscovery(userId: string, io: Server): boolean {
        const startTime = this.discoveryStartTime.get(userId);
        const attempts = this.discoveryAttempts.get(userId) || 0;

        if (!startTime) return true;

        const elapsedTime = Date.now() - startTime;

        // Verificar límite de tiempo (2 horas)
        if (elapsedTime > this.MAX_DISCOVERY_TIME_MS) {
            logger.info(
                { userId, elapsedHours: (elapsedTime / 1000 / 60 / 60).toFixed(1) },
                'YouTube discovery timeout - stopping to save quota'
            );
            this.stopDiscovery(userId);
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'youtube',
                'error',
                'No se detectó stream en vivo. Reconecta cuando vayas a iniciar stream.'
            );
            return false;
        }

        // Verificar límite de intentos (60 intentos)
        if (attempts >= this.MAX_DISCOVERY_ATTEMPTS) {
            logger.info(
                { userId, attempts },
                'YouTube discovery max attempts reached - stopping to save quota'
            );
            this.stopDiscovery(userId);
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'youtube',
                'error',
                'No se detectó stream en vivo. Reconecta cuando vayas a iniciar stream.'
            );
            return false;
        }

        return true;
    }

    private stopDiscovery(userId: string) {
        const cleanup = this.discoveryCleanup.get(userId);
        if (cleanup) {
            cleanup();
            this.discoveryCleanup.delete(userId);
        }
        // Limpiar contadores
        this.discoveryStartTime.delete(userId);
        this.discoveryAttempts.delete(userId);
    }

    async disconnect(userId: string): Promise<void> {
        this.stopDiscovery(userId);
        this.chatPoller.stopPolling(userId);
        this.viewerPoller.stopPolling(userId);
    }
}
