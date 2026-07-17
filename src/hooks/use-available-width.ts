'use client';

import { useState, useEffect } from 'react';

/**
 * 检测视口宽度是否超过阈值，用于动态决定侧边栏显示。
 *
 * 默认阈值 1280px：超过时显示桌面端 TOC 侧栏，
 * 低于时切换为移动端抽屉模式。
 * SSR 安全：初始值为 false（假设窄屏），客户端挂载后更新。
 */
export function useAvailableWidth(threshold = 1280): boolean {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const check = () => setWide(window.innerWidth >= threshold);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [threshold]);

  return wide;
}
