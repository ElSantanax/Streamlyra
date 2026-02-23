import { useContext, createContext } from 'react';
import type { ConnectionStatus, ConnectionStats, LastFollower, LastRaid } from '../types';
import type { PlatformKey } from '../constants/platforms';

export interface ConnectionsStatusContextValue {
    connectionsStatus: Record<string, ConnectionStatus>;
    isLoadingConnections: boolean;
    connectionsError: string | null;
    connectionHash: string;
    disconnectPlatform: (platform: PlatformKey) => Promise<void>;
    refetchConnections: (force?: boolean) => Promise<void>;
    searchStream: (platform: PlatformKey) => void;
    getConnectedPlatforms: () => string[];
}

export interface ConnectionsStatsContextValue {
    connectionsStats: Record<string, ConnectionStats>;
    updateConnectionStats: (platform: string, updates: Partial<ConnectionStats>) => void;
    lastFollower: LastFollower | null;
    lastRaid: LastRaid | null;
}

export const ConnectionsStatusContext = createContext<ConnectionsStatusContextValue | undefined>(undefined);
export const ConnectionsStatsContext = createContext<ConnectionsStatsContextValue | undefined>(undefined);

export const useConnectionsStatus = () => {
    const ctx = useContext(ConnectionsStatusContext);
    if (!ctx) throw new Error('useConnectionsStatus debe usarse dentro de <ConnectionsProvider>');
    return ctx;
};

export const useConnectionsStats = () => {
    const ctx = useContext(ConnectionsStatsContext);
    if (!ctx) throw new Error('useConnectionsStats debe usarse dentro de <ConnectionsProvider>');
    return ctx;
};