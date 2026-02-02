/**
 * Hook para manejo de conexiones de plataformas
 * Encapsula la lógica de estado de conexiones
 * 
 * OPTIMIZACIÓN: Se comparan valores antes de actualizar para evitar re-renders innecesarios
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

/**
 * Compara dos ConnectionInfo para determinar si son equivalentes
 * Retorna true si son iguales (no necesita actualización)
 */
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
      // Usar el campo "connected" del servidor para saber si hay una conexión guardada
      // El estado real de chat activo vendrá del socket, pero mostramos 'connecting' mientras sincroniza
      setConnections(prev => {
        const updated: Record<string, ConnectionInfo> = {};
        let hasChanges = false;

        Object.keys(data.connections).forEach(platform => {
          const serverConnected = data.connections[platform].connected;
          const prevPlatform = prev[platform];
          const prevStatus = prevPlatform?.status;
          const prevConnected = prevPlatform?.connected;

          // Si el servidor indica que hay conexión guardada pero el socket aún no confirmó,
          // establecer status 'connecting' para que la plataforma aparezca en el Sidebar
          const shouldShowAsConnecting = serverConnected && !prevConnected && !prevStatus;

          const newConnection: ConnectionInfo = {
            connected: prevConnected ?? false,
            username: data.connections[platform].username,
            viewers: prevPlatform?.viewers ?? 0,
            status: prevStatus ?? (shouldShowAsConnecting ? 'connecting' : undefined),
            statusMessage: prevPlatform?.statusMessage
          };

          // Verificar si este platform cambió
          if (!isConnectionEqual(prevPlatform, newConnection)) {
            hasChanges = true;
          }

          updated[platform] = newConnection;
        });

        // Solo retornar nuevo objeto si hay cambios reales
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

      // Crear el nuevo objeto con los updates
      const newConnection: ConnectionInfo = {
        ...prevPlatform,
        ...updates,
      };

      // Si es igual, no actualizar (evitar re-render)
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
