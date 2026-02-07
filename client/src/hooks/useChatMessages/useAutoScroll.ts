import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

const SCROLL_THRESHOLD = 50;
const REENABLE_THRESHOLD = 20;

interface UseAutoScrollOptions {
  trigger?: unknown;
}

interface UseAutoScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  isAutoScrollEnabled: boolean;
}

export const useAutoScroll = (options: UseAutoScrollOptions = {}): UseAutoScrollReturn => {
  const { trigger } = options;

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isUserScrollingRef = useRef(false);
  const isAutoScrollEnabledRef = useRef(true);
  const lastScrollTopRef = useRef(0);

  const setAutoScrollEnabled = useCallback((enabled: boolean) => {
    isAutoScrollEnabledRef.current = enabled;
    setIsAutoScrollEnabled(prev => (prev === enabled ? prev : enabled));
  }, []);

  const scrollToBottomSmooth = useCallback(() => {
    const element = messagesEndRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const enableAutoScroll = useCallback(() => {
    setAutoScrollEnabled(true);
    isUserScrollingRef.current = false;
    scrollToBottomSmooth();
  }, [scrollToBottomSmooth, setAutoScrollEnabled]);

  useEffect(() => {
    let rafId: number | null = null;
    let container: HTMLDivElement | null = null;

    const handleScroll = () => {
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom <= REENABLE_THRESHOLD;

      const isScrollingUp = scrollTop < lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (isAtBottom) {
        setAutoScrollEnabled(true);
        isUserScrollingRef.current = false;
        return;
      }

      if (isAutoScrollEnabledRef.current) {
        setAutoScrollEnabled(false);
      }

      // Marcamos intención de usuario si sube o se aleja suficientemente.
      if (isScrollingUp || distanceFromBottom > SCROLL_THRESHOLD) {
        isUserScrollingRef.current = true;
      }
    };

    const tryAttach = () => {
      container = containerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(tryAttach);
        return;
      }

      container.addEventListener('scroll', handleScroll, { passive: true });
    };

    tryAttach();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [setAutoScrollEnabled]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !trigger) return;

    if (isAutoScrollEnabledRef.current && !isUserScrollingRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [trigger]);

  useEffect(() => {
    const handleResize = () => {
      if (isAutoScrollEnabledRef.current && containerRef.current && !isUserScrollingRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    messagesEndRef,
    containerRef,
    scrollToBottom: enableAutoScroll,
    isAutoScrollEnabled,
  };
};