import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, MessageStatus } from '../../types';
import { ensureMessageId } from './helpers';
import { useAutoScroll } from './useAutoScroll';

const MAX_MESSAGES = 500;
const FLUSH_INTERVAL_MS = 75; // 13 updates/sec max para evitar congelamiento de UI en raids

const mergePendingMessages = (currentMessages: ChatMessage[], newMessages: ChatMessage[]) => {
  if (newMessages.length === 0) return currentMessages;

  // Filtrar duplicados: comparamos ID y Plataforma
  // porque el mismo ID puede existir en diferentes plataformas
  const uniqueNewMessages = newMessages.filter((newMsg, index) => {
    if (!newMsg.id) return true;

    // Verificar si ya existe en el estado actual
    const existsInState = currentMessages.some(
      m => m.id === newMsg.id && m.platform === newMsg.platform
    );
    if (existsInState) return false;

    // Verificar si es un duplicado dentro del mismo lote (batch)
    const existsInBatch = newMessages.findIndex(
      m => m.id === newMsg.id && m.platform === newMsg.platform
    ) < index;
    if (existsInBatch) return false;

    return true;
  });

  if (uniqueNewMessages.length === 0) return currentMessages;

  const combined = [...currentMessages, ...uniqueNewMessages];

  if (combined.length > MAX_MESSAGES) {
    return combined.slice(combined.length - MAX_MESSAGES);
  }
  return combined;
};

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushMessages = useCallback(() => {
    // Limpiamos la referencia al timeout primero para permitir nuevos agendamientos
    flushTimeoutRef.current = null;

    // Capturamos los mensajes pendientes FUERA del updater de estado
    // Esto evita efectos secundarios en updaters (que React puede re-ejecutar)
    const pending = [...pendingMessagesRef.current];
    if (pending.length === 0) return;

    // Limpiamos la lista de pendientes sincronamente
    pendingMessagesRef.current = [];

    setMessages(prev => mergePendingMessages(prev, pending));
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    const messageWithId = ensureMessageId(message);
    pendingMessagesRef.current.push(messageWithId);

    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(flushMessages, FLUSH_INTERVAL_MS);
    }
  }, [flushMessages]);

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  const withFlush = useCallback((updater: (prevMessages: ChatMessage[]) => ChatMessage[] | ChatMessage[]) => {
    // Capturamos y limpiamos pendientes antes de realizar cualquier actualización
    const pending = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];

    setMessages(prev => {
      const messagesWithPending = mergePendingMessages(prev, pending);
      return updater(messagesWithPending);
    });
  }, []);

  const updateMessageStatus = useCallback((
    messageId: string,
    status: MessageStatus,
    errorMessage?: string,
    platformIds?: Record<string, string>
  ) => {
    withFlush(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status, errorMessage, platformIds }
          : msg
      )
    );
  }, [withFlush]);

  const removeMessage = useCallback((messageId: string) => {
    withFlush(prev => prev.filter(msg => msg.id !== messageId));
  }, [withFlush]);

  const removeMessagesByUserId = useCallback((userId: string) => {
    withFlush(prev => prev.filter(msg => msg.userId !== userId));
  }, [withFlush]);

  const clearMessages = useCallback(() => {
    pendingMessagesRef.current = [];
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    setMessages([]);
  }, []);

  const {
    messagesEndRef,
    containerRef,
    scrollToBottom,
    isAutoScrollEnabled
  } = useAutoScroll({
    trigger: messages
  });

  return {
    messages,
    addMessage,
    updateMessageStatus,
    removeMessage,
    removeMessagesByUserId,
    clearMessages,
    messagesEndRef,
    containerRef,
    scrollToBottom,
    isAutoScrollEnabled,
  };
};