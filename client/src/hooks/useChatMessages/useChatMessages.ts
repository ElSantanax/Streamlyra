import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, MessageStatus } from '../../types';
import { ensureMessageId } from './helpers';
import { useAutoScroll } from './useAutoScroll';

const MAX_MESSAGES = 200;
const FLUSH_INTERVAL_MS = 75; // 13 updates/sec max para evitar congelamiento de UI en raids

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergePendingMessages = (currentMessages: ChatMessage[], newMessages: ChatMessage[]) => {
    if (newMessages.length === 0) return currentMessages;

    const uniqueNewMessages = newMessages.filter(
      newMsg => !newMsg.id || !currentMessages.some(m => m.id === newMsg.id)
    );

    if (uniqueNewMessages.length === 0) return currentMessages;

    const combined = [...currentMessages, ...uniqueNewMessages];

    if (combined.length > MAX_MESSAGES) {
      return combined.slice(combined.length - MAX_MESSAGES);
    }
    return combined;
  };

  const flushMessages = useCallback(() => {
    flushTimeoutRef.current = null;

    setMessages(prev => {
      const pending = pendingMessagesRef.current;
      if (pending.length === 0) return prev;

      pendingMessagesRef.current = [];
      return mergePendingMessages(prev, pending);
    });
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

  const withFlush = (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => {
    setMessages(prev => {
      const pending = pendingMessagesRef.current;
      pendingMessagesRef.current = [];

      const messagesWithPending = mergePendingMessages(prev, pending);

      return updater(messagesWithPending);
    });
  };

  const updateMessageStatus = useCallback((
    messageId: string,
    status: MessageStatus,
    errorMessage?: string
  ) => {
    withFlush(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, status, errorMessage }
          : msg
      )
    );
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    withFlush(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const removeMessagesByUserId = useCallback((userId: string) => {
    withFlush(prev => prev.filter(msg => msg.userId !== userId));
  }, []);

  const clearMessages = useCallback(() => {
    pendingMessagesRef.current = [];
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