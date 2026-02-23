import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../../services/api/auth.service';
import { socket } from '../../services/socket';
import type {
    ConnectionStatus,
    ConnectionStats,
    LastFollower,
    LastRaid,
    MeResponse
} from '../../types';
import type { PlatformKey } from '../../constants/platforms';

import { initialStatus, initialStats } from './constants';
import { cachedData, invalidateConnectionsCache, setLastFetchTime } from './cache';
import { parseMeResponse } from './utils';
import { useConnectionsApi } from './useConnectionsApi';
import { useConnectionsSocket } from './useConnectionsSocket';

export { invalidateConnectionsCache };

export const useConnections = (shouldFetch = true) => {
    // 1. Estado centralizado
    const [status, setStatus] = useState<Record<string, ConnectionStatus>>(() => parseMeResponse(cachedData).status);
    const [stats, setStats] = useState<Record<string, ConnectionStats>>(() => parseMeResponse(cachedData).stats);
    const [lastFollower, setLastFollower] = useState<LastFollower | null>(cachedData?.lastFollower || null);
    const [lastRaid, setLastRaid] = useState<LastRaid | null>(cachedData?.lastRaid || null);
    const [isLoading, setIsLoading] = useState(shouldFetch && !cachedData);
    const [error, setError] = useState<string | null>(null);

    // 2. Refs para evitar re-renders en handlers
    const statusRef = useRef(status);
    const statsRef = useRef(stats);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        statusRef.current = status;
        statsRef.current = stats;
    }, [status, stats]);

    // 3. Handlers de actualización de estado (compartidos)
    const updateStatus = useCallback((platform: string, updates: Partial<ConnectionStatus>) => {
        setStatus(prev => {
            const next = { ...prev[platform], ...updates };
            if (JSON.stringify(prev[platform]) === JSON.stringify(next)) return prev;
            return { ...prev, [platform]: next };
        });
    }, []);

    const updateStats = useCallback((platform: string, updates: Partial<ConnectionStats>) => {
        setStats(prev => {
            const next = { ...prev[platform], ...updates };
            if (JSON.stringify(prev[platform]) === JSON.stringify(next)) return prev;
            return { ...prev, [platform]: next };
        });
    }, []);

    const processData = useCallback((data: MeResponse) => {
        if (!data || !data.connections) return;

        setStatus(prev => {
            const next = { ...prev };
            let changed = false;

            Object.keys(initialStatus).forEach(platform => {
                const fetched = data.connections[platform];
                if (!fetched) return;

                const updated: ConnectionStatus = {
                    connected: fetched.connected,
                    username: fetched.username,
                    status: prev[platform]?.status,
                    statusMessage: prev[platform]?.statusMessage,
                    isLive: fetched.isLive
                };

                if (JSON.stringify(updated) !== JSON.stringify(prev[platform])) {
                    next[platform] = updated;
                    changed = true;
                }
            });

            return changed ? next : prev;
        });

        setStats(prev => {
            const next = { ...prev };
            let changed = false;

            Object.keys(initialStatus).forEach(platform => {
                const fetched = data.connections[platform];
                if (!fetched) return;

                const updated: ConnectionStats = {
                    viewers: fetched.viewers ?? 0,
                    sessionStartTime: fetched.sessionStartTime,
                    serverTime: fetched.serverTime
                };

                if (JSON.stringify(updated) !== JSON.stringify(prev[platform])) {
                    next[platform] = updated;
                    changed = true;
                }
            });

            return changed ? next : prev;
        });

        if (data.lastFollower) setLastFollower(data.lastFollower);
        if (data.lastRaid) setLastRaid(data.lastRaid);
    }, []);

    // 4. Inyección de lógica especializada (Hooks internos)
    const { fetchConnections } = useConnectionsApi({
        shouldFetch,
        isMounted,
        setIsLoading,
        setError,
        processData
    });

    useConnectionsSocket({
        statusRef,
        updateStatus,
        updateStats,
        setLastFollower,
        setLastRaid
    });

    // 5. Acciones manuales
    const disconnectPlatform = useCallback(async (platform: PlatformKey) => {
        try {
            await authService.disconnectPlatform(platform);

            // Actualización inteligente de caché
            if (cachedData && cachedData.connections && cachedData.connections[platform]) {
                cachedData.connections[platform].connected = false;
                cachedData.connections[platform].isLive = false;
                cachedData.connections[platform].viewers = 0;
                // Marcamos como "viejo" para refrescar en background
                setLastFetchTime(0);
            } else {
                invalidateConnectionsCache();
            }

            updateStatus(platform, { connected: false, isLive: false, status: 'disconnected' });
            updateStats(platform, { viewers: 0 });
        } catch (err) {
            console.error('Error disconnecting platform:', err);
            throw err;
        }
    }, [updateStatus, updateStats]);

    const searchStream = useCallback((platform: PlatformKey) => {
        if (platform === 'youtube') socket.emit('youtube_boost_discovery');
        else if (platform === 'tiktok') socket.emit('tiktok_boost_discovery');
    }, []);

    // 6. Efecto de carga inicial/limpieza
    useEffect(() => {
        if (shouldFetch) {
            fetchConnections();
        } else {
            // Evitar cascading renders innecesarios
            Promise.resolve().then(() => {
                setStatus(initialStatus);
                setStats(initialStats);
                setLastFollower(null);
                setLastRaid(null);
                invalidateConnectionsCache();
            });
        }
    }, [shouldFetch, fetchConnections]);

    return {
        connectionsStatus: status,
        connectionsStats: stats,
        lastFollower,
        lastRaid,
        isLoading,
        error,
        updateStatus,
        updateStats,
        disconnectPlatform,
        refetch: fetchConnections,
        searchStream
    };
};
