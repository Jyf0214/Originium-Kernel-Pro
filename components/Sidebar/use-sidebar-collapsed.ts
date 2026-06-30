'use client';

import { useCallback, useState, useEffect } from 'react';

const STORAGE_KEY = 'originium-sidebar-collapsed';

/**
 * 侧栏折叠状态管理 hook
 *
 * - 使用 localStorage 持久化折叠状态
 * - 仅在桌面端（md 以上）生效
 * - 初始值为 false（展开），从 localStorage 读取覆盖
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 客户端 hydration 时从 localStorage 读取
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch {
      // localStorage 不可用时保持默认值
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // 写入失败不影响状态切换
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, hydrated };
}
