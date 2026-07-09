'use client';

import { useEffect } from 'react';
import { SITE_CONFIG } from '@/data/site-config';

/**
 * 从构建时内嵌配置读取 fontSize 并设置为 CSS 变量 --base-font-size
 * 该变量在 globals.css 中被 html 字号引用
 */
export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const size = SITE_CONFIG.appearance?.fontSize;
    if (typeof size === 'number' && size >= 10 && size <= 30) {
      document.documentElement.style.setProperty('--base-font-size', `${size}px`);
    }
  }, []);

  return <>{children}</>;
}
