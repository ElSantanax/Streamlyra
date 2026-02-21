import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/api/auth.service';
import type { ConnectionInfo, ConnectionStatus, ConnectionStats, ConnectionStatusUpdate, ViewersUpdate, LastFollower } from '../types';
import type { PlatformKey } from '../constants/platforms';
import { socket } from '../services/socket';

const initialStatus: Record<string, ConnectionStatus> = {
  twitch: { connected: false },
  youtube: { connected: false },
  tiktok: { connected: false },
  kick: { connected: false },
};

const initialStats: Record<string, ConnectionStats> = {
  twitch: { viewers: 0 },
  youtube: { viewers: 0 },
  tiktok: { viewers: 0 },
  kick: { viewers: 0 },
};

import type { MeResponse } from '../types';

// Cache global fuera del hook para persistir entre montajes
let cachedData: MeResponse | null = null;
let lastFetchTime = 0;
let activePromise: Promise<MeResponse> | null = null; // Promesa en vuelo para deduplicación
const CACHE_DURATION = 30000; // 30 segundos

export const invalidateConnectionsCache = () => {
  cachedData = null;
  lastFetchTime = 0;
};

export const useConnections = (shouldFetch = true) => {
  const [status, setStatus] = useState<Record<string, ConnectionStatus>>(initialStatus);
  const [stats, setStats] = useState<Record<string, ConnectionStats>>(initialStats);
  const [lastFollower, setLastFollower] = useState<LastFollower | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usamos refs para acceder al estado actual dentro de los callbacks de socket sin recrearlos
  const statusRef = useRef(status);
  const statsRef = useRef(stats);

  useEffect(() => {
    statusRef.current = status;
    statsRef.current = stats;
  }, [status, stats]);

  const processData = useCallback((data: MeResponse) => {
    const newStatus: Record<string, ConnectionStatus> = {};
    const newStats: Record<string, ConnectionStats> = {};
    let statusChanged = false;
    let statsChanged = false;

    Object.keys(data.connections).forEach(platform => {
      const fetched = data.connections[platform];

      // Extraer Status
      newStatus[platform] = {
        connected: fetched.connected,
        username: fetched.username,
        status: statusRef.current[platform]?.status, // Mantener status efímero si existe
        statusMessage: statusRef.current[platform]?.statusMessage,
        isLive: fetched.isLive
      };

      // Extraer Stats
      newStats[platform] = {
        viewers: fetched.viewers ?? 0,
        sessionStartTime: fetched.sessionStartTime,
        serverTime: fetched.serverTime
      };

      if (JSON.stringify(newStatus[platform]) !== JSON.stringify(statusRef.current[platform])) {
        statusChanged = true;
      }
      if (JSON.stringify(newStats[platform]) !== JSON.stringify(statsRef.current[platform])) {
        statsChanged = true;
      }
    });

    if (statusChanged) setStatus(newStatus);
    if (statsChanged) setStats(newStats);

    // Inicializar lastFollower desde la respuesta del /me (si existe, con lógica de 7 días ya aplicada en el servidor)
    if (data.lastFollower) {
      setLastFollower(data.lastFollower);
    }
  }, []);

  const fetchConnections = useCallback(async (force = false) => {
    if (!shouldFetch) return;

    // 1. Verificar caché cliente (si no forzamos actualización y es válida)
    const now = Date.now();
    if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
      processData(cachedData);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 2. Deduplicación de peticiones en vuelo
      // Si ya hay una promesa activa (alguien más pidió datos hace milisegundos), nos colgamos de ella
      let data;
      if (activePromise && !force) {
        data = await activePromise;
      } else {
        // Si no hay promesa activa, creamos una nueva y la guardamos globalmente
        const promise = authService.getMe();
        activePromise = promise;

        try {
          data = await promise;
          // Solo actualizamos caché si la petición fue exitosa
          cachedData = data;
          lastFetchTime = Date.now();
        } finally {
          // Importante: Limpiar la promesa activa al terminar (sea éxito o error)
          // para permitir futuras peticiones frescas
          if (activePromise === promise) {
            activePromise = null;
          }
        }
      }

      processData(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching connections');
    } finally {
      setIsLoading(false);
    }
  }, [shouldFetch, processData]);

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

  const disconnectPlatform = useCallback(async (platform: PlatformKey) => {
    try {
      await authService.disconnectPlatform(platform);
      invalidateConnectionsCache(); // Invalidar caché para que la próxima petición sea fresca
      updateStatus(platform, { connected: false, isLive: false, status: 'disconnected' });
      updateStats(platform, { viewers: 0 });
    } catch (err) {
      console.error('Error disconnecting platform:', err);
      throw err;
    }
  }, [updateStatus, updateStats]);

  useEffect(() => {
    if (shouldFetch) fetchConnections();
  }, [shouldFetch, fetchConnections]);

  useEffect(() => {
    const onConnectionStatus = (data: ConnectionStatusUpdate) => {
      updateStatus(data.platform, {
        connected: data.status === 'connected' || data.status === 'waiting_stream' || data.status === 'connecting',
        status: data.status,
        statusMessage: data.message,
        isLive: data.isLive
      });

      if (data.serverTime) {
        updateStats(data.platform, {
          sessionStartTime: data.sessionStartTime,
          serverTime: data.serverTime
        });
      }
    };

    const onViewersUpdate = (data: ViewersUpdate) => {
      if (!statusRef.current[data.platform]?.connected) return;

      updateStats(data.platform, {
        viewers: data.count,
        sessionStartTime: data.sessionStartTime,
        serverTime: data.serverTime
      });

      // Si el estado de isLive cambia en el evento de viewers, actualizar Status
      if (data.isLive !== undefined && data.isLive !== statusRef.current[data.platform]?.isLive) {
        updateStatus(data.platform, { isLive: data.isLive });
      }
    };

    const onLastFollowerUpdate = (data: LastFollower) => {
      setLastFollower(data);
    };

    socket.on('connection_status', onConnectionStatus);
    socket.on('viewers_update', onViewersUpdate);
    socket.on('last_follower_update', onLastFollowerUpdate);

    return () => {
      socket.off('connection_status', onConnectionStatus);
      socket.off('viewers_update', onViewersUpdate);
      socket.off('last_follower_update', onLastFollowerUpdate);
    };
  }, [updateStatus, updateStats, fetchConnections]);

  // Helper para mantener compatibilidad con componentes que aún esperen ConnectionInfo unido
  const mergedConnections = Object.keys(status).reduce((acc, platform) => {
    acc[platform] = { ...status[platform], ...stats[platform] } as ConnectionInfo;
    return acc;
  }, {} as Record<string, ConnectionInfo>);

  return {
    connections: mergedConnections, // Mantener por compatibilidad inicial
    connectionsStatus: status,
    connectionsStats: stats,
    lastFollower,
    isLoading,
    error,
    updateConnection: (p: string, u: Partial<ConnectionInfo>) => {
      const { viewers, sessionStartTime, serverTime, ...statusUpdates } = u;
      if (Object.keys(statusUpdates).length > 0) updateStatus(p, statusUpdates);
      if (viewers !== undefined || sessionStartTime || serverTime) {
        updateStats(p, { viewers, sessionStartTime, serverTime });
      }
    },
    disconnectPlatform,
    refetch: fetchConnections,
    searchStream: (platform: PlatformKey) => {
      if (platform === 'youtube') socket.emit('youtube_boost_discovery');
      else if (platform === 'tiktok') socket.emit('tiktok_boost_discovery');
    }
  };
};