/**
 * Hook para manejo de mensajes de chat
 * Encapsula la lógica de estado y filtrado de mensajes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, MessageStatus } from '../types';

const MAX_MESSAGES = 100;

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Evitar duplicados si el mensaje tiene ID
      if (message.id && prev.some(m => m.id === message.id)) {
        return prev;
      }

      // Limitar historial para rendimiento
      if (prev.length >= MAX_MESSAGES) {
        return [...prev.slice(1), message];
      }

      return [...prev, message];
    });
  }, []);

  const updateMessageStatus = useCallback((messageId: string, status: MessageStatus, errorMessage?: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status, errorMessage } 
          : msg
      )
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll cuando llegan mensajes nuevos
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return {
    messages,
    addMessage,
    updateMessageStatus,
    clearMessages,
    messagesEndRef,
    scrollToBottom,
  };
};
