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
  const lastScrollTopRef = useRef(0);

  const scrollToBottomSmooth = useCallback(() => {
    const element = messagesEndRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const enableAutoScroll = useCallback(() => {
    setIsAutoScrollEnabled(true);
    isUserScrollingRef.current = false;
    scrollToBottomSmooth();
  }, [scrollToBottomSmooth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom <= REENABLE_THRESHOLD;

      const isScrollingUp = scrollTop < lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;

      if (isAtBottom) {
        if (!isAutoScrollEnabled) {
          setIsAutoScrollEnabled(true);
        }
        isUserScrollingRef.current = false;
      } else {
        if (isAutoScrollEnabled) {
          if (isScrollingUp || distanceFromBottom > SCROLL_THRESHOLD) {
            setIsAutoScrollEnabled(false);
            isUserScrollingRef.current = true;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isAutoScrollEnabled]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !trigger) return;

    if (isAutoScrollEnabled && !isUserScrollingRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [trigger, isAutoScrollEnabled]);

  useEffect(() => {
    const handleResize = () => {
      if (isAutoScrollEnabled && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAutoScrollEnabled]);

  return {
    messagesEndRef,
    containerRef,
    scrollToBottom: enableAutoScroll,
    isAutoScrollEnabled,
  };
};