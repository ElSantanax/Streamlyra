/** Gestor de estado de conexiones activas de YouTube con tracking de pollers y discovery */

import { YouTubeChatPoller } from './YouTubeChatPoller';
import { YouTubeViewerPoller } from './YouTubeViewerPoller';

interface ConnectionState {
    chatPoller: YouTubeChatPoller;
    viewerPoller: YouTubeViewerPoller;
    autoAttempts: number;
    isManualMode: boolean;
    cleanup?: () => void;
    isActive: boolean;
}

export class YouTubeConnectionStateManager {
    private states: Map<string, ConnectionState> = new Map();
    private connectingUsers: Set<string> = new Set();

    constructor() { }

    private getOrCreateState(userId: string): ConnectionState {
        let state = this.states.get(userId);
        if (!state) {
            state = {
                chatPoller: new YouTubeChatPoller(),
                viewerPoller: new YouTubeViewerPoller(),
                autoAttempts: 0,
                isManualMode: false,
                isActive: false
            };
            this.states.set(userId, state);
        }
        return state;
    }

    isConnecting(userId: string): boolean {
        return this.connectingUsers.has(userId);
    }

    setConnecting(userId: string, isConnecting: boolean): void {
        if (isConnecting) this.connectingUsers.add(userId);
        else this.connectingUsers.delete(userId);
    }

    hasActiveConnection(userId: string): boolean {
        return this.states.get(userId)?.isActive || false;
    }

    getChatPoller(userId: string): YouTubeChatPoller {
        return this.getOrCreateState(userId).chatPoller;
    }

    getViewerPoller(userId: string): YouTubeViewerPoller {
        return this.getOrCreateState(userId).viewerPoller;
    }

    // Discovery tracking
    getAutoAttempts(userId: string): number {
        return this.states.get(userId)?.autoAttempts || 0;
    }

    incrementAutoAttempts(userId: string): void {
        const state = this.getOrCreateState(userId);
        state.autoAttempts++;
    }

    isManualMode(userId: string): boolean {
        return this.states.get(userId)?.isManualMode || false;
    }

    setManualMode(userId: string, isManual: boolean): void {
        const state = this.getOrCreateState(userId);
        state.isManualMode = isManual;
    }

    setDiscoveryCleanup(userId: string, cleanup: () => void): void {
        const state = this.getOrCreateState(userId);
        if (state.cleanup) state.cleanup();
        state.cleanup = cleanup;
    }

    markAsConnected(userId: string): void {
        const state = this.getOrCreateState(userId);
        state.isActive = true;
    }

    clearState(userId: string): void {
        const state = this.states.get(userId);
        if (state) {
            if (state.cleanup) state.cleanup();
            state.chatPoller.stopPolling(userId);
            state.viewerPoller.stopPolling(userId);
            state.isActive = false;
        }
        this.states.delete(userId);
        this.connectingUsers.delete(userId);
    }
}
