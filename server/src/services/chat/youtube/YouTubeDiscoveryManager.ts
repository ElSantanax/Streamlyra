/** Gestor de discovery de YouTube con búsqueda automática inicial y manual */

import { Server } from 'socket.io';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { YouTubePollingConfig } from '../../../config/youtube.polling.config';

interface DiscoveryState {
    cleanup: () => void;
    autoAttempts: number;
    isManualMode: boolean;
}

export class YouTubeDiscoveryManager {
    private discoveries: Map<string, DiscoveryState> = new Map();
    private connectingUsers: Set<string> = new Set();

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
            autoAttempts: 0,
            isManualMode: false
        });
    }

    incrementAutoAttempts(userId: string): void {
        const state = this.discoveries.get(userId);
        if (state && !state.isManualMode) {
            state.autoAttempts++;
        }
    }

    getAutoAttempts(userId: string): number {
        return this.discoveries.get(userId)?.autoAttempts || 0;
    }

    shouldContinueAutoDiscovery(userId: string): boolean {
        const state = this.discoveries.get(userId);
        if (!state) return true;

        return state.autoAttempts < YouTubePollingConfig.AUTO_DISCOVERY_MAX_ATTEMPTS;
    }

    switchToManualMode(userId: string, io: Server): void {
        const state = this.discoveries.get(userId);
        if (state) {
            state.isManualMode = true;
            logger.info(
                { userId, autoAttempts: state.autoAttempts },
                'YouTube auto-discovery exhausted, switching to waiting_stream mode'
            );
            
            SafeSocketEmitter.emitConnectionStatus(
                io,
                userId,
                'youtube',
                'waiting_stream',
                'Esperando que inicies tu stream...'
            );
        }
    }

    activateManualSearch(userId: string): void {
        const state = this.discoveries.get(userId);
        if (state) {
            state.isManualMode = true;
            logger.info({ userId }, 'Manual search activated by user');
        }
    }

    stopDiscovery(userId: string): void {
        const state = this.discoveries.get(userId);
        if (state) {
            state.cleanup();
            this.discoveries.delete(userId);
        }
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
            'Cuota de YouTube agotada. Intenta mañana.'
        );
    }
}
