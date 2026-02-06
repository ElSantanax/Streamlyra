import { createContext, useContext, useMemo } from 'react';
import { useConnections } from '../hooks/useConnections';
import { useAuth } from '../hooks/useAuth';
import type { ConnectionInfo } from '../types';
import type { PlatformKey } from '../constants/platforms';

export interface ConnectionsContextValue {
    connections: Record<string, ConnectionInfo>;
    updateConnection: (platform: string, updates: Partial<ConnectionInfo>) => void;
    disconnectPlatform: (platform: PlatformKey) => Promise<void>;
    refetchConnections: () => Promise<void>;
    searchStream: (platform: PlatformKey) => void;
    isLoadingConnections: boolean;
    connectionsError: string | null;
}

const ConnectionsContext = createContext<ConnectionsContextValue | undefined>(undefined);

export const ConnectionsProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();

    const {
        connections,
        updateConnection,
        disconnectPlatform,
        refetch: refetchConnections,
        searchStream,
        isLoading: isLoadingConnections,
        error: connectionsError
    } = useConnections(isAuthenticated);

    const value = useMemo(() => ({
        connections,
        updateConnection,
        disconnectPlatform,
        refetchConnections,
        searchStream,
        isLoadingConnections,
        connectionsError,
    }), [
        connections,
        updateConnection,
        disconnectPlatform,
        refetchConnections,
        searchStream,
        isLoadingConnections,
        connectionsError
    ]);

    return (
        <ConnectionsContext.Provider value={value}>
            {children}
        </ConnectionsContext.Provider>
    );
};

export const useConnectionsContext = () => {
    const ctx = useContext(ConnectionsContext);
    if (!ctx) {
        throw new Error('useConnections debe usarse dentro de <ConnectionsProvider>.');
    }
    return ctx;
};
