'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ScrollDirectionState {
  /** 当前 scrollY */
  scrollY: number;
  /** 滚动方向：'up' | 'down' | null（初始状态） */
  direction: 'up' | 'down' | null;
  /** 是否滚动超过阈值（默认 26px） */
  pastThreshold: boolean;
}

/**
 * 滚动方向检测 Hook — 返回 scrollY + 方向 + 阈值判断
 * 用于导航栏隐藏/显示逻辑
 */
export function useScrollDirection(threshold = 26): ScrollDirectionState {
  const [state, setState] = useState<ScrollDirectionState>({
    scrollY: 0,
    direction: null,
    pastThreshold: false,
  });
  const lastScrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const handleScroll = useCallback(() => {
    const now = performance.now();
    if (now - lastTimeRef.current < 16) return;
    lastTimeRef.current = now;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const currentY = window.scrollY || document.documentElement.scrollTop;
      const prevY = lastScrollYRef.current;
      const diff = currentY - prevY;

      // 忽略微小抖动（< 5px）
      if (Math.abs(diff) < 5) return;

      const direction = diff > 0 ? 'down' : 'up';
      lastScrollYRef.current = currentY;

      setState({
        scrollY: currentY,
        direction,
        pastThreshold: currentY > threshold,
      });
    });
  }, [threshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return state;
}
