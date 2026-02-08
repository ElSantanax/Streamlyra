import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api/auth.service';
import type { ConnectionInfo } from '../types';
import type { PlatformKey } from '../constants/platforms';

import { socket } from '../services/socket';

const initialConnections: Record<string, ConnectionInfo> = {
  twitch: { connected: false, viewers: 0 },
  youtube: { connected: false, viewers: 0 },
  tiktok: { connected: false, viewers: 0 },
  kick: { connected: false, viewers: 0 },
};

const isConnectionEqual = (a: ConnectionInfo | undefined, b: ConnectionInfo): boolean => {
  if (!a) return false;
  return (
    a.connected === b.connected &&
    a.username === b.username &&
    a.viewers === b.viewers &&
    a.status === b.status &&
    a.statusMessage === b.statusMessage &&
    a.isLive === b.isLive &&
    a.sessionStartTime === b.sessionStartTime &&
    a.serverTime === b.serverTime
  );
};

export const useConnections = (shouldFetch = true) => {
  const [connections, setConnections] = useState<Record<string, ConnectionInfo>>(initialConnections);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!shouldFetch) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.getMe();
      setConnections(prev => {
        const updated: Record<string, ConnectionInfo> = {};
        let hasChanges = false;

        Object.keys(data.connections).forEach(platform => {
          const serverConnected = data.connections[platform].connected;
          const prevPlatform = prev[platform];
          const prevStatus = prevPlatform?.status;
          const prevConnected = prevPlatform?.connected;

          const shouldShowAsConnecting = serverConnected && !prevConnected && !prevStatus;

          const newConnection: ConnectionInfo = {
            connected: serverConnected,
            username: data.connections[platform].username,
            viewers: prevPlatform?.viewers ?? 0,
            status: prevStatus ?? (shouldShowAsConnecting ? 'connecting' : undefined),
            statusMessage: prevPlatform?.statusMessage,
            isLive: data.connections[platform].isLive ?? prevPlatform?.isLive,
            sessionStartTime: data.connections[platform].sessionStartTime !== undefined
              ? data.connections[platform].sessionStartTime
              : prevPlatform?.sessionStartTime,
            serverTime: data.connections[platform].serverTime ?? prevPlatform?.serverTime
          };

          if (!isConnectionEqual(prevPlatform, newConnection)) {
            hasChanges = true;
          }

          updated[platform] = newConnection;
        });

        return hasChanges ? updated : prev;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching connections';
      setError(message);
      console.error('Error fetching connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [shouldFetch]);

  const updateConnection = useCallback((platform: string, updates: Partial<ConnectionInfo>) => {
    setConnections(prev => {
      const prevPlatform = prev[platform];

      // Clean updates: only apply keys that are NOT undefined
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      const newConnection: ConnectionInfo = {
        ...prevPlatform,
        ...cleanUpdates,
      };

      if (isConnectionEqual(prevPlatform, newConnection)) {
        return prev;
      }

      return {
        ...prev,
        [platform]: newConnection,
      };
    });
  }, []);

  const disconnectPlatform = useCallback(async (platform: PlatformKey) => {
    try {
      await authService.disconnectPlatform(platform);
      updateConnection(platform, {
        connected: false,
        viewers: 0,
        isLive: false
      });
    } catch (err) {
      console.error('Error disconnecting platform:', err);
      throw err;
    }
  }, [updateConnection]);

  const searchStream = useCallback((platform: PlatformKey) => {
    if (platform === 'youtube') {
      socket.emit('youtube_boost_discovery');
    } else if (platform === 'tiktok') {
      socket.emit('tiktok_boost_discovery');
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const onConnectionStatus = (data: {
      platform: string;
      status: string;
      message?: string;
      isLive?: boolean;
      sessionStartTime?: string;
      serverTime?: string;
    }) => {
      console.log('Socket Connection Status Update:', data);

      const isConnected = data.status === 'connected';

      updateConnection(data.platform, {
        status: data.status as 'connecting' | 'waiting_stream' | 'connected' | 'error' | 'disconnected',
        statusMessage: data.message,
        connected: isConnected || data.status === 'waiting_stream' || data.status === 'connecting',
        isLive: data.isLive,
        sessionStartTime: data.sessionStartTime,
        serverTime: data.serverTime
      });
    };

    const onViewersUpdate = (data: {
      platform: string;
      count: number;
      isLive?: boolean;
      sessionStartTime?: string;
      serverTime?: string;
    }) => {
      // Solo actualizar si la plataforma está marcada como conectada en el estado local
      setConnections(prev => {
        if (!prev[data.platform]?.connected) {
          return prev;
        }

        return {
          ...prev,
          [data.platform]: {
            ...prev[data.platform],
            viewers: data.count,
            isLive: data.isLive,
            sessionStartTime: data.sessionStartTime,
            serverTime: data.serverTime
          }
        };
      });
    };

    socket.on('connection_status', onConnectionStatus);
    socket.on('viewers_update', onViewersUpdate);

    return () => {
      socket.off('connection_status', onConnectionStatus);
      socket.off('viewers_update', onViewersUpdate);
    };
  }, [updateConnection]);

  return {
    connections,
    isLoading,
    error,
    updateConnection,
    disconnectPlatform,
    refetch: fetchConnections,
    searchStream,
  };
};