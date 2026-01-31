/**
 * Hook para manejo de mensajes de chat
 * Implementa comportamiento de scroll estilo Twitch/Kick:
 * - Auto-scroll por defecto cuando llegan mensajes nuevos
 * - Detección de scroll manual del usuario para pausar auto-scroll
 * - Contador de mensajes nuevos no leídos
 * - Botón para volver al final del chat
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, MessageStatus } from '../types';

const MAX_MESSAGES = 50;
const SCROLL_THRESHOLD = 150; // px desde el final para considerar que está "en el final"

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Evitar duplicados si el mensaje tiene ID
      if (message.id && prev.some(m => m.id === message.id)) {
        return prev;
      }

      // Asegurar que el mensaje tenga ID para evitar problemas de rendering y scroll anchoring
      const messageWithId = {
        ...message,
        id: message.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Limitar historial para rendimiento
      if (prev.length >= MAX_MESSAGES) {
        return [...prev.slice(1), messageWithId];
      }

      return [...prev, messageWithId];
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

  // Verificar si el usuario está en el final del chat
  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  // Scroll inmediato al final (estilo Twitch/Kick)
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
    const element = messagesEndRef.current;
    if (!element) return;

    // Usar scrollIntoView con behavior instant para simular Twitch
    element.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Habilitar auto-scroll y volver al final
  const enableAutoScroll = useCallback(() => {
    setIsAutoScrollEnabled(true);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // Manejar redimensionamiento de ventana (mantiene el scroll abajo si es necesario)
  useEffect(() => {
    const handleResize = () => {
      if (isAutoScrollEnabled) {
        scrollToBottom('auto');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAutoScrollEnabled, scrollToBottom]);

  // Detectar scroll manual del usuario
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: number;

    const handleScroll = () => {
      // Cancelar timeout anterior
      clearTimeout(scrollTimeout);

      const currentScrollTop = container.scrollTop;
      const isScrollingDown = currentScrollTop > lastScrollTopRef.current;
      lastScrollTopRef.current = currentScrollTop;

      // Si el usuario está en el final, habilitar auto-scroll
      if (isAtBottom()) {
        if (!isAutoScrollEnabled) {
          setIsAutoScrollEnabled(true);
        }
        isUserScrollingRef.current = false;
        return;
      }

      // Si el usuario hizo scroll hacia arriba, deshabilitar auto-scroll
      if (!isScrollingDown) {
        isUserScrollingRef.current = true;
        setIsAutoScrollEnabled(false);
      }

      // Timeout para detectar cuando el usuario dejó de scrollear
      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isAtBottom, isAutoScrollEnabled]);

  // Auto-scroll cuando llegan mensajes nuevos (solo si está habilitado)
  useEffect(() => {
    if (messages.length === 0) return;

    // Solo hacer auto-scroll si está habilitado y el usuario no está scrolleando manualmente
    if (isAutoScrollEnabled && !isUserScrollingRef.current) {
      // Usar requestAnimationFrame para asegurar que el DOM se actualice primero
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
    }
  }, [messages, isAutoScrollEnabled, scrollToBottom]);

  return {
    messages,
    addMessage,
    updateMessageStatus,
    clearMessages,
    messagesEndRef,
    containerRef,
    scrollToBottom: enableAutoScroll,
    isAutoScrollEnabled,
  };
};
