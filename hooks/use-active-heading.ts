'use client';

import { useState, useEffect } from 'react';

/**
 * 监听页面中各标题元素的可见性，返回当前高亮的标题 id。
 *
 * - 通过 IntersectionObserver 监听所有 heading 元素
 * - rootMargin: 顶部留 80px 导航栏空间，底部留 30% 可见区域
 * - 首个进入视口的标题被设为 active
 * - headings 变化时自动重新挂载观察器
 */
export function useActiveHeading(headings: { id: string }[]): string {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 返回第一个可见的 heading
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  return activeId;
}
