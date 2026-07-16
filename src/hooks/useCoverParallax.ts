'use client';

import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';

/**
 * 封面视差 Hook — 基于滚动位置计算封面的缩放和位移
 *
 * @param coverRef 封面容器的 ref
 * @returns { scale, translateY } CSS 变换值
 *
 * 移动端（< 768px）和 prefers-reduced-motion 时禁用视差
 */
export function useCoverParallax(
  coverRef: RefObject<HTMLElement | null>,
): { scale: number; translateY: number } {
  const [transform, setTransform] = useState({ scale: 1, translateY: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const handleScroll = useCallback(() => {
    const now = performance.now();
    if (now - lastTimeRef.current < 16) return;
    lastTimeRef.current = now;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = coverRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const coverHeight = rect.height;

      // 封面完全滚出视口时停止动画
      if (rect.bottom <= 0) return;

      // 滚动进度：0（封面顶部在视口顶部）→ 1（封面底部滚到视口顶部）
      const progress = Math.min(Math.max(-rect.top / coverHeight, 0), 1);

      // 缩放：从 1.0 到 1.08（8% 增量）
      const scale = 1 + progress * 0.08;
      // 垂直位移：从 0 到 -30px（向上位移产生视差）
      const translateY = progress * -30;

      setTransform({ scale, translateY });
    });
  }, [coverRef]);

  useEffect(() => {
    // 移动端禁用视差
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    // prefers-reduced-motion 禁用
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始计算
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return transform;
}
