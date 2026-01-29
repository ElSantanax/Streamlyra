/** Gestor de discovery de YouTube con protección automática de cuotas */

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

    private readonly MAX_DISCOVERY_TIME_MS = 2 * 60 * 60 * 1000;
    private readonly MAX_DISCOVERY_ATTEMPTS = 60;

    isConnecting(userId: string): boolean {
        return this.connectingUsers.has(userId);
    }

    markAsConnecting(userId: string): void {
        this.connectingUsers.add(userId);
    }

    unmarkAsConnecting(userId: string): void {
        this.connectingUsers.delete(userId);
    }

    hasActiveDiscovery(userId: string): boolean {
        return this.discoveries.has(userId);
    }

    registerDiscovery(userId: string, cleanup: () => void): void {
        this.discoveries.set(userId, {
            cleanup,
            startTime: Date.now(),
            attempts: 0
        });
    }

    incrementAttempts(userId: string): number {
        const state = this.discoveries.get(userId);
        if (state) {
            state.attempts++;
            return state.attempts;
        }
        return 0;
    }

    shouldContinueDiscovery(userId: string, io: Server): boolean {
        const state = this.discoveries.get(userId);
        if (!state) return true;

        const elapsedTime = Date.now() - state.startTime;

        if (elapsedTime > this.MAX_DISCOVERY_TIME_MS) {
            logger.info(
                { userId, elapsedHours: (elapsedTime / 1000 / 60 / 60).toFixed(1) },
                'YouTube discovery timeout - stopping to save quota'
            );
            this.stopDiscovery(userId);
            this.notifyDiscoveryTimeout(io, userId);
            return false;
        }

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

    stopDiscovery(userId: string): void {
        const state = this.discoveries.get(userId);
        if (state) {
            state.cleanup();
            this.discoveries.delete(userId);
        }
    }

    private notifyDiscoveryTimeout(io: Server, userId: string): void {
        SafeSocketEmitter.emitConnectionStatus(
            io,
            userId,
            'youtube',
            'error',
            'No se detectó stream en vivo. Reconecta cuando vayas a iniciar stream.'
        );
    }

    notifyQuotaExceeded(io: Server, userId: string): void {
        logger.warn(
            { userId },
            'YouTube quota exceeded - Stopping discovery and notifying user'
        );
        this.stopDiscovery(userId);
        SafeSocketEmitter.emitConnectionStatus(
            io,
            userId,
            'youtube',
            'error',
            'Cuota de YouTube agotada. Por favor, espera hasta mañana para que se renueve la cuota diaria.'
        );
    }
}
