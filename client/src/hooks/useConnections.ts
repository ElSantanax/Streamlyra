/**
 * Hook para manejo de conexiones de plataformas
 * Encapsula la lógica de estado de conexiones
 */

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
      // Usar el campo "connected" del servidor para saber si hay una conexión guardada
      // El estado real de chat activo vendrá del socket, pero mostramos 'connecting' mientras sincroniza
      setConnections(prev => {
        const updated: Record<string, ConnectionInfo> = {};
        Object.keys(data.connections).forEach(platform => {
          const serverConnected = data.connections[platform].connected;
          const prevStatus = prev[platform]?.status;
          const prevConnected = prev[platform]?.connected;

          // Si el servidor indica que hay conexión guardada pero el socket aún no confirmó,
          // establecer status 'connecting' para que la plataforma aparezca en el Sidebar
          const shouldShowAsConnecting = serverConnected && !prevConnected && !prevStatus;

          updated[platform] = {
            // Mantener el estado connected del socket si ya existe
            connected: prevConnected ?? false,
            username: data.connections[platform].username,
            // Mantener viewers si ya existían, de lo contrario usar 0
            viewers: prev[platform]?.viewers ?? 0,
            // Si hay conexión en servidor pero socket no ha confirmado, mostrar como 'connecting'
            status: prevStatus ?? (shouldShowAsConnecting ? 'connecting' : undefined),
            statusMessage: prev[platform]?.statusMessage
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
      // Importar socket dinámicamente para evitar dependencia circular
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
