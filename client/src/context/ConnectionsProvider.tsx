import { useMemo, useRef, useEffect, useCallback } from 'react';
import { useConnections } from '../hooks/useConnections';
import { useAuth } from '../hooks/useAuth';
import { ConnectionsContext } from '../hooks/useConnectionsContext';
import type { ConnectionInfo } from '../types';
import type { PlatformKey } from '../constants/platforms';

export interface ConnectionsContextValue {
    connections: Record<string, ConnectionInfo>;
    updateConnection: (platform: string, updates: Partial<ConnectionInfo>) => void;
    disconnectPlatform: (platform: PlatformKey) => Promise<void>;
    refetchConnections: () => Promise<void>;
    refetchSilent: () => Promise<void>;
    searchStream: (platform: PlatformKey) => void;
    getConnectedPlatforms: () => string[];
    isLoadingConnections: boolean;
    connectionsError: string | null;
    // Nueva propiedad para saber si la conectividad estructural cambió
    connectionHash: string;
}

export const ConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const connectionsRef = useRef<Record<string, ConnectionInfo>>({});

    const {
        connections,
        updateConnection,
        disconnectPlatform,
        refetch: refetchConnections,
        refetchSilent,
        searchStream,
        isLoading: isLoadingConnections,
        error: connectionsError
    } = useConnections(isAuthenticated);

    // Sincronizar la ref
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // Generar un hash que SOLO cambie cuando cambia el estado de conexión, no los viewers
    const connectionHash = useMemo(() => {
        return Object.entries(connections)
            .map(([platform, info]) => `${platform}:${info.connected}:${info.status}`)
            .join('|');
    }, [connections]);

    const getConnectedPlatforms = useCallback(() => {
        return Object.entries(connectionsRef.current)
            .filter(([, info]) => info.connected)
            .map(([platform]) => platform);
    }, []);

    const value = useMemo(() => ({
        connections,
        updateConnection,
        disconnectPlatform,
        refetchConnections,
        refetchSilent,
        searchStream,
        getConnectedPlatforms,
        isLoadingConnections,
        connectionsError,
        connectionHash
    }), [
        connections,
        updateConnection,
        disconnectPlatform,
        refetchConnections,
        refetchSilent,
        searchStream,
        getConnectedPlatforms,
        isLoadingConnections,
        connectionsError,
        connectionHash
    ]);

    return (
        <ConnectionsContext.Provider value={value}>
            {children}
        </ConnectionsContext.Provider>
    );
};

