'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyLoadProps {
  children: ReactNode;
  /** 距离视口多远时开始加载（px），默认 200 */
  rootMargin?: string;
  className?: string;
}

/**
 * 通用懒加载包装器
 *
 * 使用 IntersectionObserver 延迟渲染子组件，直到滚动到视口附近。
 * 适用于评论系统、重型组件等非首屏必需内容。
 */
export function LazyLoad({ children, rootMargin = '200px', className }: LazyLoadProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 浏览器不支持 IntersectionObserver 时立即加载
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : null}
    </div>
  );
}
