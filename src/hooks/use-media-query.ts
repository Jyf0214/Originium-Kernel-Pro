'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // 初始 false 与 SSR 一致：渲染期执行 matchMedia 会导致 hydration mismatch
  // （SSR 无浏览器环境渲染 false，客户端按视口渲染真实值 → React 整树重建）
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
