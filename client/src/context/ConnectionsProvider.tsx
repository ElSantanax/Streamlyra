import { useMemo, useCallback } from 'react';
import { useConnections } from '../hooks/useConnections';
import { useAuth } from '../hooks/useAuth';
import {
    ConnectionsStatusContext,
    ConnectionsStatsContext
} from '../hooks/useConnectionsContext';
import type { ConnectionStats } from '../types';

export const ConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();

    const {
        connectionsStatus,  // Optimized
        connectionsStats,   // Optimized
        lastFollower,       // Último seguidor
        lastRaid,           // Último raid
        updateStats,
        disconnectPlatform,
        refetch: refetchConnections,
        searchStream,
        isLoading: isLoadingConnections,
        error: connectionsError
    } = useConnections(isAuthenticated);

    // Hash estructural
    const connectionHash = useMemo(() => {
        return Object.entries(connectionsStatus)
            .map(([p, s]) => `${p}:${s.connected}:${s.isLive}`)
            .join('|');
    }, [connectionsStatus]);

    const getConnectedPlatforms = useCallback(() => {
        return Object.entries(connectionsStatus)
            .filter(([, s]) => s.connected)
            .map(([p]) => p);
    }, [connectionsStatus]);

    // 1. Valor para STATUS (Poco frecuente)
    const statusValue = useMemo(() => ({
        connectionsStatus,
        isLoadingConnections,
        connectionsError,
        connectionHash,
        disconnectPlatform,
        refetchConnections,
        searchStream,
        getConnectedPlatforms
    }), [
        connectionsStatus,
        isLoadingConnections,
        connectionsError,
        connectionHash,
        disconnectPlatform,
        refetchConnections,
        searchStream,
        getConnectedPlatforms
    ]);

    const updateConnectionStats = useCallback((p: string, u: Partial<ConnectionStats>) => {
        updateStats(p, u);
    }, [updateStats]);

    // 2. Valor para STATS (Frecuente)
    const statsValue = useMemo(() => ({
        connectionsStats,
        updateConnectionStats,
        lastFollower,
        lastRaid
    }), [connectionsStats, updateConnectionStats, lastFollower, lastRaid]);

    return (
        <ConnectionsStatusContext.Provider value={statusValue}>
            <ConnectionsStatsContext.Provider value={statsValue}>
                {children}
            </ConnectionsStatsContext.Provider>
        </ConnectionsStatusContext.Provider>
    );
};


