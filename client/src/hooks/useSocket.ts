import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';
import { useConnectionsStore } from '../store/useConnectionsStore';

interface UseSocketOptions {
  userId?: string;
}

/**
 * Hook para gestionar el ciclo de vida de la conexión física del Socket.
 * Las suscripciones a datos específicos ahora residen en sus respectivos stores de Zustand.
 */
export const useSocket = ({ userId }: UseSocketOptions) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const hasIdentifiedRef = useRef(false);
  const currentUserIdRef = useRef<string | undefined>(userId);
  
  // Consumir estado directamente de Zustand
  const connections = useConnectionsStore(state => state.connectionsStatus);
  const connectionHash = useConnectionsStore(state => state.connectionHash);
  const connectionsRef = useRef(connections);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const connect = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  }, []);

  // Control de conexión basado en autenticación y plataformas activas
  useEffect(() => {
    const hasActivePlatforms = Object.values(connectionsRef.current).some(
      (conn) => conn.connected === true
    );

    if (userId && hasActivePlatforms && !socket.connected) {
      socket.connect();
    } else if ((!hasActivePlatforms || !userId) && socket.connected) {
      socket.disconnect();
      hasIdentifiedRef.current = false;
    }
  }, [connectionHash, userId]);

  useEffect(() => {
    if (!userId) {
      hasIdentifiedRef.current = false;
      currentUserIdRef.current = undefined;
      return;
    }

    if (currentUserIdRef.current !== userId) {
      hasIdentifiedRef.current = false;
      currentUserIdRef.current = userId;
    }

    const handleConnect = () => {
      setIsConnected(true);

      if (userId && !hasIdentifiedRef.current) {
        socket.emit('identify', userId);
        hasIdentifiedRef.current = true;
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      hasIdentifiedRef.current = false;
    };

    const handleReconnect = () => {
      setIsConnected(true);
      if (userId && !hasIdentifiedRef.current) {
        socket.emit('identify', userId);
        hasIdentifiedRef.current = true;
      }
    };

    const handleConnectError = (error: Error) => {
      if (userId) {
        console.error('Error de conexión Socket.IO:', error);
      }
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    socket.on('connect_error', handleConnectError);

    if (socket.connected && !hasIdentifiedRef.current) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [userId]);

  return {
    isConnected,
    connect,
    disconnect,
  };
};