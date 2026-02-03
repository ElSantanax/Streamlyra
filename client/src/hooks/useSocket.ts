import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';
import type { ChatMessage, ViewersUpdate, ConnectionStatusUpdate, ConnectionInfo } from '../types';

interface UseSocketOptions {
  userId?: string;
  onChatMessage?: (message: ChatMessage) => void;
  onMessageStatusUpdate?: (messageId: string, status: 'sending' | 'sent' | 'error', errorMessage?: string) => void;
  onViewersUpdate?: (data: ViewersUpdate) => void;
  onConnectionStatus?: (data: ConnectionStatusUpdate) => void;
  connections?: Record<string, ConnectionInfo>;
}

export const useSocket = ({
  userId,
  onChatMessage,
  onMessageStatusUpdate,
  onViewersUpdate,
  onConnectionStatus,
  connections = {},
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
    const hasActivePlatforms = Object.values(connections).some(
      (conn) => conn.connected === true
    );

    if (hasActivePlatforms && !socket.connected) {
      socket.connect();
    } else if (!hasActivePlatforms && socket.connected) {
      socket.disconnect();
      hasIdentifiedRef.current = false;
    }
  }, [connections]);

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
      console.error('Error de conexión Socket.IO:', error);
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

  useEffect(() => {
    if (!isConnected || !userId) return;

    const HEARTBEAT_INTERVAL = 30000;

    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') {
        socket.emit('heartbeat');
      }
    };

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        socket.emit('heartbeat');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, userId]);

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
    const handleChatMessage = (msg: ChatMessage) => {
      if (msg.platform === 'dashboard') {
        onChatMessageRef.current?.(msg);
        return;
      }

      if (msg.platform && !connectionsRef.current[msg.platform]?.connected) {
        return;
      }
      onChatMessageRef.current?.(msg);
    };

    const handleMessageStatusUpdate = (data: { messageId: string; status: 'sending' | 'sent' | 'error'; errorMessage?: string }) => {
      onMessageStatusUpdateRef.current?.(data.messageId, data.status, data.errorMessage);
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

    socket.on('chat_message', handleChatMessage);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('viewers_update', handleViewersUpdate);
    socket.on('connection_status', handleConnectionStatus);

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