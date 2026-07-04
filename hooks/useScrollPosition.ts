'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 滚动位置 Hook — 返回节流后的 scrollY
 * 使用 16ms throttle（约 60fps），避免频繁触发 re-render
 */
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const handleScroll = useCallback(() => {
    const now = performance.now();
    if (now - lastTimeRef.current < 16) return; // 16ms throttle
    lastTimeRef.current = now;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrollY(window.scrollY || document.documentElement.scrollTop);
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return scrollY;
}
