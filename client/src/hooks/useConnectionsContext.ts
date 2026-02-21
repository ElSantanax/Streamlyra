import { useContext, createContext } from 'react';
import type { ConnectionStatus, ConnectionStats, ConnectionInfo, LastFollower } from '../types';
import type { PlatformKey } from '../constants/platforms';

/**
 * Contexto para el estado estructural de las conexiones (Conectado, Username, isLive)
 * Cambia con poca frecuencia.
 */
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

/**
 * Contexto para estadísticas de alta frecuencia (Viewers, Timers, Último Seguidor)
 */
export interface ConnectionsStatsContextValue {
    connectionsStats: Record<string, ConnectionStats>;
    updateConnectionStats: (platform: string, updates: Partial<ConnectionStats>) => void;
    lastFollower: LastFollower | null;
}

/**
 * Contexto Legado (Mantiene compatibilidad temporal)
 */
export interface LegacyConnectionsContextValue extends ConnectionsStatusContextValue {
    connections: Record<string, ConnectionInfo>;
    updateConnection: (platform: string, updates: Partial<ConnectionInfo>) => void;
}

export const ConnectionsStatusContext = createContext<ConnectionsStatusContextValue | undefined>(undefined);
export const ConnectionsStatsContext = createContext<ConnectionsStatsContextValue | undefined>(undefined);
export const ConnectionsContext = createContext<LegacyConnectionsContextValue | undefined>(undefined);

/**
 * Hooks especializados para evitar re-renders innecesarios
 */

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

/** Hook legado */
export const useConnectionsContext = () => {
    const ctx = useContext(ConnectionsContext);
    if (!ctx) throw new Error('useConnectionsContext debe usarse dentro de <ConnectionsProvider>');
    return ctx;
};
