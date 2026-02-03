import { useState, useEffect, useCallback } from 'react';
import { authService } from '../api/services';
import type { ConnectionInfo } from '../types';
import type { PlatformKey } from '../constants/platforms';

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
    a.statusMessage === b.statusMessage
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
            statusMessage: prevPlatform?.statusMessage
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

      const newConnection: ConnectionInfo = {
        ...prevPlatform,
        ...updates,
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
        status: undefined,
        statusMessage: undefined
      });
    } catch (err) {
      console.error('Error disconnecting platform:', err);
      throw err;
    }
  }, [updateConnection]);

  const searchStream = useCallback((platform: PlatformKey) => {
    if (platform === 'youtube') {
      import('../services/socket').then(({ socket }) => {
        socket.emit('youtube_boost_discovery');
      });
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

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