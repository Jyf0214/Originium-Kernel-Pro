'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

interface HeadingRef {
  id: string;
}

/**
 * 监听页面中各标题元素的可见性，返回当前高亮的标题 id。
 *
 * - 通过 IntersectionObserver 监听所有 heading 元素
 * - 首个进入视口（顶部偏移 80px、底部 80%）的标题被设为 active
 * - headings 内容变化时才重新挂载观察器，引用变化但内容相同不重建
 */
export function useTocActive(headings: HeadingRef[]): string {
  const [activeId, setActiveId] = useState<string>('');

  // 序列化 headings 内容作为稳定的依赖键，避免引用变化导致不必要的 observer 重建
  const headingsKey = useMemo(() => JSON.stringify(headings), [headings]);
  const prevKeyRef = useRef<string>(headingsKey);

  useEffect(() => {
    if (headings.length === 0) return;

    // 内容未变化时跳过重建
    if (headingsKey === prevKeyRef.current && prevKeyRef.current !== '') return;
    prevKeyRef.current = headingsKey;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingsKey]);

  return activeId;
}
