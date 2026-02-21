import { useMemo, useRef, useEffect, useCallback } from 'react';
import { useConnections } from '../hooks/useConnections';
import { useAuth } from '../hooks/useAuth';
import {
    ConnectionsStatusContext,
    ConnectionsStatsContext,
    ConnectionsContext
} from '../hooks/useConnectionsContext';
import type { ConnectionInfo, ConnectionStats } from '../types';

export const ConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const connectionsRef = useRef<Record<string, ConnectionInfo>>({});

    const {
        connections,        // Legacy
        connectionsStatus,  // Optimized
        connectionsStats,   // Optimized
        lastFollower,       // Último seguidor
        updateConnection,
        disconnectPlatform,
        refetch: refetchConnections,
        searchStream,
        isLoading: isLoadingConnections,
        error: connectionsError
    } = useConnections(isAuthenticated);

    // Sincronizar la ref para getConnectedPlatforms
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

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

    // 2. Valor para STATS (Frecuente)
    const statsValue = useMemo(() => ({
        connectionsStats,
        updateConnectionStats: (p: string, u: Partial<ConnectionStats>) => updateConnection(p, u),
        lastFollower
    }), [connectionsStats, updateConnection, lastFollower]);

    // 3. Valor LEGADO (Cambia siempre)
    const legacyValue = useMemo(() => ({
        ...statusValue,
        connections,
        updateConnection
    }), [statusValue, connections, updateConnection]);

    return (
        <ConnectionsStatusContext.Provider value={statusValue}>
            <ConnectionsStatsContext.Provider value={statsValue}>
                <ConnectionsContext.Provider value={legacyValue}>
                    {children}
                </ConnectionsContext.Provider>
            </ConnectionsStatsContext.Provider>
        </ConnectionsStatusContext.Provider>
    );
};


