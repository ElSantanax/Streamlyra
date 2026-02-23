import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';
import type { ChatMessage, ViewersUpdate, ConnectionStatusUpdate, ConnectionStatus } from '../types';

interface UseSocketOptions {
  userId?: string;
  onChatMessage?: (message: ChatMessage) => void;
  onMessageStatusUpdate?: (messageId: string, status: 'sending' | 'sent' | 'error', errorMessage?: string, platformIds?: Record<string, string>) => void;
  onViewersUpdate?: (data: ViewersUpdate) => void;
  onConnectionStatus?: (data: ConnectionStatusUpdate) => void;
  connections?: Record<string, ConnectionStatus>;

  connectionHash?: string;
}

export const useSocket = ({
  userId,
  onChatMessage,
  onMessageStatusUpdate,
  onViewersUpdate,
  onConnectionStatus,
  connections = {},
  connectionHash = '',
}: UseSocketOptions) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const hasIdentifiedRef = useRef(false);
  const currentUserIdRef = useRef<string | undefined>(userId);
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

  useEffect(() => {
    // Solo conectar si hay usuario autenticado Y plataformas activas
    const hasActivePlatforms = Object.values(connectionsRef.current).some(
      (conn) => conn.connected === true
    );

    if (userId && hasActivePlatforms && !socket.connected) {
      socket.connect();
    } else if ((!hasActivePlatforms || !userId) && socket.connected) {
      socket.disconnect();
      hasIdentifiedRef.current = false;
    }
  }, [connectionHash, userId]); // Depender del Hash y userId

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
      // Solo loguear si hay usuario autenticado (evitar spam cuando no hay sesión)
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

  const onChatMessageRef = useRef(onChatMessage);
  const onMessageStatusUpdateRef = useRef(onMessageStatusUpdate);
  const onViewersUpdateRef = useRef(onViewersUpdate);
  const onConnectionStatusRef = useRef(onConnectionStatus);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    onMessageStatusUpdateRef.current = onMessageStatusUpdate;
    onViewersUpdateRef.current = onViewersUpdate;
    onConnectionStatusRef.current = onConnectionStatus;
  }, [onChatMessage, onMessageStatusUpdate, onViewersUpdate, onConnectionStatus]);

  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage | ChatMessage[]) => {
      const messages = Array.isArray(msg) ? msg : [msg];

      messages.forEach(m => {
        if (m.platform === 'dashboard') {
          onChatMessageRef.current?.(m);
          return;
        }

        if (m.platform && !connectionsRef.current[m.platform]?.connected) {
          console.warn(`[Socket] Mensaje omitido: ${m.platform} no está conectado en el cliente`, m);
          return;
        }
        onChatMessageRef.current?.(m);
      });
    };


    const handleMessageStatusUpdate = (data: {
      messageId: string;
      status: 'sending' | 'sent' | 'error';
      errorMessage?: string;
      platformIds?: Record<string, string>;
    }) => {
      onMessageStatusUpdateRef.current?.(data.messageId, data.status, data.errorMessage, data.platformIds);
    };

    const handleViewersUpdate = (data: ViewersUpdate) => {
      if (!connectionsRef.current[data.platform]?.connected) {
        return;
      }
      onViewersUpdateRef.current?.(data);
    };

    const handleConnectionStatus = (data: ConnectionStatusUpdate) => {
      onConnectionStatusRef.current?.(data);
    };

    if (onChatMessageRef.current) {
      socket.on('chat_message', handleChatMessage);
    }
    if (onMessageStatusUpdateRef.current) {
      socket.on('message_status_update', handleMessageStatusUpdate);
    }
    if (onViewersUpdateRef.current) {
      socket.on('viewers_update', handleViewersUpdate);
    }
    if (onConnectionStatusRef.current) {
      socket.on('connection_status', handleConnectionStatus);
    }

    return () => {
      socket.off('chat_message', handleChatMessage);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('viewers_update', handleViewersUpdate);
      socket.off('connection_status', handleConnectionStatus);
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
  };
};