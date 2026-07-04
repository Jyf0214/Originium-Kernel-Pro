'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'reading-progress-';

/**
 * 滚动进度 Hook — 监听页面滚动，返回 0-1 的阅读进度
 * 基于 scrollY / (scrollHeight - clientHeight) 计算
 *
 * 支持持久化：传入 pageKey 时自动保存/恢复阅读位置
 */
export function useScrollProgress(pageKey?: string): number {
  const [progress, setProgress] = useState(() => {
    if (pageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PREFIX + pageKey);
        return saved ? parseFloat(saved) : 0;
      } catch {
        return 0;
      }
    }
    return 0;
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

  // 保存进度到 localStorage
  const saveProgress = useCallback(() => {
    if (!pageKey) return;
    try {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight <= 0) return;
      const pct = scrollTop / scrollHeight;
      // 仅保存超过 5% 的进度，避免误触
      if (pct > 0.05) {
        localStorage.setItem(STORAGE_KEY_PREFIX + pageKey, String(pct));
      }
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, [pageKey]);

  // 恢复滚动位置
  useEffect(() => {
    if (!pageKey || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + pageKey);
      if (saved) {
        const pct = parseFloat(saved);
        // 仅在 5%~85% 范围内恢复，避免跳到文章末尾（>85% 视为已读完）
        if (pct > 0.05 && pct < 0.85) {
          // 延迟恢复，等 DOM 渲染完成
          requestAnimationFrame(() => {
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            window.scrollTo(0, scrollHeight * pct);
          });
        }
      }
    } catch {
      // 静默忽略
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

  return progress;
}
