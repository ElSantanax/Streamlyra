import { create } from 'zustand';
import { authService } from '../services/api/auth.service';
import { socket } from '../services/socket';
import type {
    ConnectionStatus,
    ConnectionStats,
    LastFollower,
    LastRaid,
    MeResponse
} from '../types';
import type { PlatformKey } from '../constants/platforms';
import { initialStatus, initialStats, CACHE_DURATION } from '../hooks/useConnections/constants';
import { parseMeResponse } from '../hooks/useConnections/utils';
import {
    cachedData,
    lastFetchTime,
    activePromise,
    setCachedData,
    setLastFetchTime,
    setActivePromise,
    invalidateConnectionsCache
} from '../hooks/useConnections/cache';

interface ConnectionsState {
    connectionsStatus: Record<string, ConnectionStatus>;
    connectionsStats: Record<string, ConnectionStats>;
    lastFollower: LastFollower | null;
    lastRaid: LastRaid | null;
    isLoading: boolean;
    error: string | null;
    connectionHash: string;

    updateStatus: (platform: string, updates: Partial<ConnectionStatus>) => void;
    updateStats: (platform: string, updates: Partial<ConnectionStats>) => void;
    setLastFollower: (follower: LastFollower | null) => void;
    setLastRaid: (raid: LastRaid | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    processData: (data: MeResponse) => void;
    fetchConnections: (force?: boolean, shouldFetch?: boolean) => Promise<void>;
    disconnectPlatform: (platform: PlatformKey) => Promise<void>;
    searchStream: (platform: PlatformKey) => void;
    getConnectedPlatforms: () => string[];
    reset: () => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
    connectionsStatus: parseMeResponse(cachedData).status,
    connectionsStats: parseMeResponse(cachedData).stats,
    lastFollower: cachedData?.lastFollower || null,
    lastRaid: cachedData?.lastRaid || null,
    isLoading: !cachedData,
    error: null,
    connectionHash: '',

    updateStatus: (platform, updates) => set((state) => {
        const prev = state.connectionsStatus[platform];
        const next = { ...prev, ...updates } as ConnectionStatus;

        if (JSON.stringify(prev) === JSON.stringify(next)) return state;

        const newStatus = {
            ...state.connectionsStatus,
            [platform]: next
        };

        return {
            connectionsStatus: newStatus,
            connectionHash: Object.entries(newStatus)
                .map(([p, s]) => `${p}:${s.connected}:${s.isLive}`)
                .join('|')
        };
    }),

    updateStats: (platform, updates) => set((state) => {
        const prev = state.connectionsStats[platform];
        const next = { ...prev, ...updates } as ConnectionStats;

        if (JSON.stringify(prev) === JSON.stringify(next)) return state;

        return {
            connectionsStats: {
                ...state.connectionsStats,
                [platform]: next
            }
        };
    }),

    setLastFollower: (lastFollower) => set({ lastFollower }),
    setLastRaid: (lastRaid) => set({ lastRaid }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    processData: (data) => set((state) => {
        if (!data || !data.connections) return state;

        const { status: freshStatus, stats: freshStats } = parseMeResponse(data);

        const nextStatus = { ...state.connectionsStatus };
        const nextStats = { ...state.connectionsStats };
        let statusChanged = false;
        let statsChanged = false;

        Object.keys(freshStatus).forEach(platform => {
            const current = state.connectionsStatus[platform];
            const fetched = freshStatus[platform];

            let finalStatus = fetched.status;

            if (current?.status === 'connecting' || current?.status === 'searching') {
                if (!fetched.isLive) {
                    finalStatus = current.status;
                }
            }

            const updated: ConnectionStatus = {
                ...fetched,
                status: finalStatus || (fetched.connected ? 'connected' : 'disconnected'),
                statusMessage: fetched.statusMessage || current?.statusMessage
            };

            if (JSON.stringify(updated) !== JSON.stringify(current)) {
                nextStatus[platform] = updated;
                statusChanged = true;
            }
        });

        Object.keys(freshStats).forEach(platform => {
            const current = state.connectionsStats[platform];
            const fetched = freshStats[platform];

            const currentStatus = state.connectionsStatus[platform];
            if (currentStatus?.isLive && current?.viewers !== undefined && current.viewers > 0) {
                fetched.viewers = current.viewers;
            }

            if (JSON.stringify(fetched) !== JSON.stringify(current)) {
                nextStats[platform] = fetched;
                statsChanged = true;
            }
        });

        const newState: Partial<ConnectionsState> = {};
        if (statusChanged) {
            newState.connectionsStatus = nextStatus;
            newState.connectionHash = Object.entries(nextStatus)
                .map(([p, s]) => `${p}:${s.connected}:${s.isLive}`)
                .join('|');
        }
        if (statsChanged) newState.connectionsStats = nextStats;
        if (data.lastFollower) newState.lastFollower = data.lastFollower;
        if (data.lastRaid) newState.lastRaid = data.lastRaid;

        return newState;
    }),

    fetchConnections: async (force = false, shouldFetch = true) => {
        if (!shouldFetch) {
            set({ isLoading: false });
            return;
        }

        const now = Date.now();
        if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
            get().processData(cachedData);
            set({ isLoading: false });
            return;
        }

        if (!cachedData) {
            set({ isLoading: true });
        }
        set({ error: null });

        try {
            let data: MeResponse;
            if (activePromise && !force) {
                data = await activePromise;
            } else {
                const promise = authService.getMe();
                setActivePromise(promise);

                try {
                    data = await promise;
                    setCachedData(data);
                    setLastFetchTime(Date.now());
                } finally {
                    setActivePromise(null);
                }
            }

            get().processData(data);
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Error fetching connections' });
        } finally {
            set({ isLoading: false });
        }
    },

    disconnectPlatform: async (platform: PlatformKey) => {
        try {
            await authService.disconnectPlatform(platform);

            if (cachedData && cachedData.connections && cachedData.connections[platform]) {
                cachedData.connections[platform].connected = false;
                cachedData.connections[platform].isLive = false;
                cachedData.connections[platform].viewers = 0;
                setLastFetchTime(0);
            } else {
                invalidateConnectionsCache();
            }

            get().updateStatus(platform, { connected: false, isLive: false, status: 'disconnected' });
            get().updateStats(platform, { viewers: 0 });
        } catch (err) {
            console.error('Error disconnecting platform:', err);
            throw err;
        }
    },

    searchStream: (platform: PlatformKey) => {
        get().updateStatus(platform, { status: 'searching' });

        if (platform === 'youtube') socket.emit('youtube_boost_discovery');
        else if (platform === 'tiktok') socket.emit('tiktok_boost_discovery');
    },

    getConnectedPlatforms: () => {
        return Object.entries(get().connectionsStatus)
            .filter(([, s]) => s.connected)
            .map(([p]) => p);
    },

    reset: () => set({
        connectionsStatus: initialStatus,
        connectionsStats: initialStats,
        lastFollower: null,
        lastRaid: null,
        isLoading: false,
        error: null,
        connectionHash: ''
    })
}));