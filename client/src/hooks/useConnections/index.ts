import { useEffect, useRef } from 'react';
import { useConnectionsStore } from '../../store/useConnectionsStore';
import { useShallow } from 'zustand/react/shallow';
import { invalidateConnectionsCache } from './cache';
import { useConnectionsSocket } from './useConnectionsSocket';
import type { ConnectionStatus, ConnectionStats, LastFollower, LastRaid } from '../../types';
import type { PlatformKey } from '../../constants/platforms';

export { invalidateConnectionsCache };

// Interfaces para los consumidores del estado
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

/**
 * Hook para acceder al estado de conexión con selectores atómicos.
 */
export const useConnectionsStatus = (): ConnectionsStatusContextValue => {
    return useConnectionsStore(useShallow(state => ({
        connectionsStatus: state.connectionsStatus,
        isLoadingConnections: state.isLoading,
        connectionsError: state.error,
        connectionHash: state.connectionHash,
        disconnectPlatform: state.disconnectPlatform,
        refetchConnections: state.fetchConnections,
        searchStream: state.searchStream,
        getConnectedPlatforms: state.getConnectedPlatforms
    })));
};

/**
 * Hook para acceder a estadísticas en tiempo real (Viewers, Followers) con selectores atómicos.
 */
export const useConnectionsStats = (): ConnectionsStatsContextValue => {
    return useConnectionsStore(useShallow(state => ({
        connectionsStats: state.connectionsStats,
        updateConnectionStats: state.updateStats,
        lastFollower: state.lastFollower,
        lastRaid: state.lastRaid
    })));
};

/**
 * Hook maestro de conexiones que coordina el ciclo de vida inicial.
 * Mantiene la suscripción a sockets y el fetch inicial, pero toda la lógica
 * de datos reside en useConnectionsStore.
 */
export const useConnections = (shouldFetch = true) => {
    const {
        connectionsStatus,
        connectionsStats,
        lastFollower,
        lastRaid,
        isLoading,
        error,
        updateStatus,
        updateStats,
        fetchConnections,
        disconnectPlatform,
        searchStream,
        reset
    } = useConnectionsStore();

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Conecta los eventos de Socket al Store global
    useConnectionsSocket();

    // Efecto de carga inicial/limpieza
    useEffect(() => {
        if (shouldFetch) {
            fetchConnections();
        } else {
            reset();
            invalidateConnectionsCache();
        }
    }, [shouldFetch, fetchConnections, reset]);

    return {
        connectionsStatus,
        connectionsStats,
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
