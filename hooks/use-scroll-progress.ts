'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'reading-progress-';

/**
 * 滚动进度 Hook — 监听页面滚动，返回 0-1 的阅读进度
 * 基于 scrollY / (scrollHeight - clientHeight) 计算
 *
 * 支持持久化：传入 pageKey 时自动保存进度到 localStorage
 * 不自动恢复——由外部组件（如 ContinueReadingPrompt）读取 savedPosition 后手动恢复
 */
export function useScrollProgress(pageKey?: string): {
  progress: number;
  /** localStorage 中保存的上次阅读位置（0-1），无记录时为 null */
  savedPosition: number | null;
  /** 清除已保存的阅读位置（用户选择从头阅读时调用） */
  clearSavedPosition: () => void;
} {
  const [progress, setProgress] = useState(0);
  const [savedPosition, setSavedPosition] = useState<number | null>(() => {
    if (pageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PREFIX + pageKey);
        if (saved) {
          const pct = parseFloat(saved);
          if (pct > 0.05 && pct < 0.85) return pct;
        }
      } catch {
        // 静默忽略
      }
    }
    return null;
  });

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) {
      setProgress(0);
      return;
    }
    const next = Math.min(Math.max(scrollTop / scrollHeight, 0), 1);
    setProgress(next);
  }, []);

  const clearSavedPosition = useCallback(() => {
    if (!pageKey) return;
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + pageKey);
    } catch {
      // 静默忽略
    }
    setSavedPosition(null);
  }, [pageKey]);

  // 保存进度到 localStorage
  const saveProgress = useCallback(() => {
    if (!pageKey) return;
    try {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight <= 0) return;
      const pct = scrollTop / scrollHeight;
      // 仅保存 5%~85% 范围内的进度
      if (pct > 0.05 && pct < 0.85) {
        localStorage.setItem(STORAGE_KEY_PREFIX + pageKey, String(pct));
      }
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, [pageKey]);

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('beforeunload', saveProgress);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('beforeunload', saveProgress);
      saveProgress();
    };
  }, [handleScroll, saveProgress]);

  return { progress, savedPosition, clearSavedPosition };
}
