import { TikTokLiveConnection } from 'tiktok-live-connector';

interface ConnectionState {
    connection?: TikTokLiveConnection;
    autoAttempts: number;
    isManualMode: boolean;
    cleanup?: () => void;
    flowId?: string;
}

export class TikTokConnectionStateManager {
    private states: Map<string, ConnectionState> = new Map();
    private connectingUsers: Set<string> = new Set();

    private getOrCreateState(userId: string): ConnectionState {
        let state = this.states.get(userId);
        if (!state) {
            state = { autoAttempts: 0, isManualMode: false };
            this.states.set(userId, state);
        }
        return state;
    }

    isConnecting(userId: string): boolean {
        return this.connectingUsers.has(userId);
    }

    hasState(userId: string): boolean {
        return this.states.has(userId);
    }

    setConnecting(userId: string, isConnecting: boolean): void {
        if (isConnecting) this.connectingUsers.add(userId);
        else this.connectingUsers.delete(userId);
    }

    hasActiveConnection(userId: string): boolean {
        return !!this.states.get(userId)?.connection;
    }

    getActiveConnection(userId: string): TikTokLiveConnection | undefined {
        return this.states.get(userId)?.connection;
    }

    setActiveConnection(userId: string, connection: TikTokLiveConnection): void {
        const state = this.getOrCreateState(userId);
        state.connection = connection;
    }

    removeActiveConnection(userId: string): void {
        const state = this.states.get(userId);
        if (state) {
            state.connection = undefined;
        }
    }

    getAutoAttempts(userId: string): number {
        return this.states.get(userId)?.autoAttempts || 0;
    }

    incrementAutoAttempts(userId: string): void {
        const state = this.states.get(userId);
        if (state) {
            state.autoAttempts++;
        }
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

    stopDiscoveryLoop(userId: string): void {
        const state = this.states.get(userId);
        if (state?.cleanup) {
            state.cleanup();
            state.cleanup = undefined;
        }
    }

    getFlowId(userId: string): string | undefined {
        return this.states.get(userId)?.flowId;
    }

    setFlowId(userId: string, flowId: string | undefined): void {
        const state = this.getOrCreateState(userId);
        state.flowId = flowId;
    }

    clearState(userId: string): void {
        const state = this.states.get(userId);
        if (state?.cleanup) state.cleanup();
        this.states.delete(userId);
        this.connectingUsers.delete(userId);
    }
}
