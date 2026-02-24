import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, MessageStatus } from '../../types';
import { ensureMessageId } from './helpers';

const MAX_MESSAGES = 200;
const FLUSH_INTERVAL_MS = 250;

const mergePendingMessages = (currentMessages: ChatMessage[], newMessages: ChatMessage[]) => {
  if (newMessages.length === 0) return currentMessages;

  const existingIds = new Set(currentMessages.map(m => `${m.id}:${m.platform}`));
  const uniqueNewMessages: ChatMessage[] = [];
  const batchIds = new Set<string>();

  for (const newMsg of newMessages) {
    if (!newMsg.id) {
      uniqueNewMessages.push(newMsg);
      continue;
    }

    const compositeId = `${newMsg.id}:${newMsg.platform}`;
    if (existingIds.has(compositeId) || batchIds.has(compositeId)) {
      continue;
    }

    uniqueNewMessages.push(newMsg);
    batchIds.add(compositeId);
  }

  if (uniqueNewMessages.length === 0) return currentMessages;

  return currentMessages.length === 0
    ? uniqueNewMessages
    : [...currentMessages, ...uniqueNewMessages];
};

export const useChatMessages = () => {
  const [chatState, setChatState] = useState<{ data: ChatMessage[] }>({
    data: []
  });

  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMessagesWithTruncation = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setChatState(prev => {
      const nextData = updater(prev.data);
      const CHUNK_SIZE = 50;
      const LIMIT = MAX_MESSAGES + CHUNK_SIZE;

      if (nextData.length > LIMIT) {
        const excessCount = nextData.length - MAX_MESSAGES;
        return {
          data: nextData.slice(excessCount)
        };
      }
      return { data: nextData };
    });
  }, []);

  const flushMessages = useCallback(() => {
    flushTimeoutRef.current = null;
    const pending = [...pendingMessagesRef.current];
    if (pending.length === 0) return;
    pendingMessagesRef.current = [];

    setMessagesWithTruncation(prev => mergePendingMessages(prev, pending));
  }, [setMessagesWithTruncation]);

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

  const withFlush = useCallback((updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => {
    const pending = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];

    setMessagesWithTruncation(prev => {
      const messagesWithPending = mergePendingMessages(prev, pending);
      return updater(messagesWithPending);
    });
  }, [setMessagesWithTruncation]);

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

  const clearMessagesByPlatform = useCallback((platform: string) => {
    withFlush(prev => prev.filter(msg => msg.platform !== platform));
  }, [withFlush]);

  const clearMessages = useCallback(() => {
    pendingMessagesRef.current = [];
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    setChatState({ data: [] });
  }, []);

  return {
    messages: chatState.data,
    addMessage,
    updateMessageStatus,
    removeMessage,
    removeMessagesByUserId,
    clearMessagesByPlatform,
    clearMessages,
  };
};