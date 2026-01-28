/**
 * Hook para manejo de conexión Socket.IO
 * Encapsula la lógica de eventos y estado del socket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';
import type { ChatMessage, ViewersUpdate, ConnectionStatusUpdate, ConnectionInfo } from '../types';

interface UseSocketOptions {
  userId?: string;
  onChatMessage?: (message: ChatMessage) => void;
  onViewersUpdate?: (data: ViewersUpdate) => void;
  onConnectionStatus?: (data: ConnectionStatusUpdate) => void;
  connections?: Record<string, ConnectionInfo>;
}

export const useSocket = ({
  userId,
  onChatMessage,
  onViewersUpdate,
  onConnectionStatus,
  connections = {},
}: UseSocketOptions) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const hasIdentifiedRef = useRef(false);
  const currentUserIdRef = useRef<string | undefined>(userId);
  const connectionsRef = useRef(connections);

  // Mantener ref actualizado
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

  // Efecto separado para manejar la conexión inicial
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // No desconectamos al desmontar para mantener la conexión
    };
  }, []);

  // Efecto separado para identificación (solo cuando cambia userId)
  useEffect(() => {
    if (!userId) {
      hasIdentifiedRef.current = false;
      currentUserIdRef.current = undefined;
      return;
    }

    // Solo identificar si cambió el userId o no se ha identificado
    if (currentUserIdRef.current !== userId) {
      hasIdentifiedRef.current = false;
      currentUserIdRef.current = userId;
    }

    const handleConnect = () => {
      setIsConnected(true);

      // Solo identificar una vez por userId
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
      console.error('Error de conexión Socket.IO:', error);
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    socket.on('connect_error', handleConnectError);

    // Si ya está conectado, identificar inmediatamente
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

  // Efecto separado para handlers de mensajes (sin causar reconexión)
  // Usar refs para evitar re-registrar listeners cuando cambian los callbacks
  const onChatMessageRef = useRef(onChatMessage);
  const onViewersUpdateRef = useRef(onViewersUpdate);
  const onConnectionStatusRef = useRef(onConnectionStatus);

  // Mantener refs actualizados
  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    onViewersUpdateRef.current = onViewersUpdate;
    onConnectionStatusRef.current = onConnectionStatus;
  }, [onChatMessage, onViewersUpdate, onConnectionStatus]);

  // Registrar listeners solo una vez
  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage) => {
      // Filtrar mensajes de plataformas desconectadas usando ref actualizado
      if (msg.platform && !connectionsRef.current[msg.platform]?.connected) {
        return;
      }
      onChatMessageRef.current?.(msg);
    };

    const handleViewersUpdate = (data: ViewersUpdate) => {
      // Filtrar actualizaciones de plataformas desconectadas usando ref actualizado
      if (!connectionsRef.current[data.platform]?.connected) {
        return;
      }
      onViewersUpdateRef.current?.(data);
    };

    const handleConnectionStatus = (data: ConnectionStatusUpdate) => {
      onConnectionStatusRef.current?.(data);
    };

    socket.on('chat_message', handleChatMessage);
    socket.on('viewers_update', handleViewersUpdate);
    socket.on('connection_status', handleConnectionStatus);

    return () => {
      socket.off('chat_message', handleChatMessage);
      socket.off('viewers_update', handleViewersUpdate);
      socket.off('connection_status', handleConnectionStatus);
    };
  }, []); // Sin dependencias - solo se ejecuta una vez

  return {
    isConnected,
    connect,
    disconnect,
  };
};
