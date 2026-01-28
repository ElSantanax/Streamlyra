/**
 * Gestor de Discovery de YouTube
 * Responsabilidad: Gestionar el ciclo de vida del discovery de broadcasts
 * 
 * GESTIÓN DE CUOTAS:
 * Este gestor implementa protecciones automáticas para evitar desperdicio de cuotas:
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
 */

import { Server } from 'socket.io';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';

interface DiscoveryState {
    cleanup: () => void;
    startTime: number;
    attempts: number;
}

export class YouTubeDiscoveryManager {
    private discoveries: Map<string, DiscoveryState> = new Map();
    private connectingUsers: Set<string> = new Set();

    // Configuración de límites para evitar desperdicio de cuotas
    // Si el usuario deja la app abierta sin estar en vivo, el discovery se detiene
    // después de estos límites para ahorrar cuotas de la API de YouTube
    private readonly MAX_DISCOVERY_TIME_MS = 2 * 60 * 60 * 1000; // 2 horas
    private readonly MAX_DISCOVERY_ATTEMPTS = 60; // 60 intentos (2 horas con intervalo de 120s)

    /**
     * Verifica si un usuario ya está en proceso de conexión
     */
    isConnecting(userId: string): boolean {
        return this.connectingUsers.has(userId);
    }

    /**
     * Marca un usuario como conectándose
     */
    markAsConnecting(userId: string): void {
        this.connectingUsers.add(userId);
    }

    /**
     * Desmarca un usuario como conectándose
     */
    unmarkAsConnecting(userId: string): void {
        this.connectingUsers.delete(userId);
    }

    /**
     * Verifica si ya existe un discovery activo para el usuario
     */
    hasActiveDiscovery(userId: string): boolean {
        return this.discoveries.has(userId);
    }

    /**
     * Registra un nuevo discovery para un usuario
     */
    registerDiscovery(userId: string, cleanup: () => void): void {
        this.discoveries.set(userId, {
            cleanup,
            startTime: Date.now(),
            attempts: 0
        });
    }

    /**
     * Incrementa el contador de intentos de discovery
     */
    incrementAttempts(userId: string): number {
        const state = this.discoveries.get(userId);
        if (state) {
            state.attempts++;
            return state.attempts;
        }
        return 0;
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
    shouldContinueDiscovery(userId: string, io: Server): boolean {
        const state = this.discoveries.get(userId);
        if (!state) return true;

        const elapsedTime = Date.now() - state.startTime;

        // Verificar límite de tiempo (2 horas)
        if (elapsedTime > this.MAX_DISCOVERY_TIME_MS) {
            logger.info(
                { userId, elapsedHours: (elapsedTime / 1000 / 60 / 60).toFixed(1) },
                'YouTube discovery timeout - stopping to save quota'
            );
            this.stopDiscovery(userId);
            this.notifyDiscoveryTimeout(io, userId);
            return false;
        }

        // Verificar límite de intentos (60 intentos)
        if (state.attempts >= this.MAX_DISCOVERY_ATTEMPTS) {
            logger.info(
                { userId, attempts: state.attempts },
                'YouTube discovery max attempts reached - stopping to save quota'
            );
            this.stopDiscovery(userId);
            this.notifyDiscoveryTimeout(io, userId);
            return false;
        }

        return true;
    }

    /**
     * Detiene el discovery para un usuario y limpia recursos
     */
    stopDiscovery(userId: string): void {
        const state = this.discoveries.get(userId);
        if (state) {
            state.cleanup();
            this.discoveries.delete(userId);
        }
    }

    /**
     * Notifica al usuario que el discovery se detuvo por timeout
     */
    private notifyDiscoveryTimeout(io: Server, userId: string): void {
        SafeSocketEmitter.emitConnectionStatus(
            io,
            userId,
            'youtube',
            'error',
            'No se detectó stream en vivo. Reconecta cuando vayas a iniciar stream.'
        );
    }

    /**
     * Notifica al usuario que la cuota de YouTube se agotó
     */
    notifyQuotaExceeded(io: Server, userId: string): void {
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
    }
}
