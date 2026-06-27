'use client';

import { useEffect, useRef } from 'react';

export function HeadInjector({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!content) return;

    // 移除旧内容，防止 prop 变化时元素累积
    if (containerRef.current) {
      containerRef.current.remove();
      containerRef.current = null;
    }

    // 创建新容器并注入子节点到 head
    const container = document.createElement('div');
    container.innerHTML = content;
    while (container.firstChild) {
      document.head.appendChild(container.firstChild);
    }
    containerRef.current = container;

    // cleanup：卸载或下次 effect 运行前移除已注入的元素
    return () => {
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    };
  }, [content]);

  return null;
}
