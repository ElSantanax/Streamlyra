/**
 * Hook para manejo de conexiones de plataformas
 * Encapsula la lógica de estado de conexiones
 */

import { useState, useEffect, useCallback } from 'react';
import { authService } from '../api/services';
import type { ConnectionInfo } from '../types';
import type { PlatformKey } from '../constants/platforms';

const initialConnections: Record<string, ConnectionInfo> = {
  twitch: { connected: false },
  youtube: { connected: false },
  tiktok: { connected: false },
  kick: { connected: false },
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
      // Preservar viewers existentes al actualizar conexiones
      setConnections(prev => {
        const updated: Record<string, ConnectionInfo> = {};
        Object.keys(data.connections).forEach(platform => {
          updated[platform] = {
            ...data.connections[platform],
            // Mantener viewers si ya existían
            viewers: prev[platform]?.viewers ?? data.connections[platform].viewers
          };
        });
        return updated;
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
    setConnections(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        ...updates,
      },
    }));
  }, []);

  const disconnectPlatform = useCallback(async (platform: PlatformKey) => {
    try {
      await authService.disconnectPlatform(platform);
      updateConnection(platform, { connected: false, viewers: 0 });
    } catch (err) {
      console.error('Error disconnecting platform:', err);
      throw err;
    }
  }, [updateConnection]);

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
  };
};
