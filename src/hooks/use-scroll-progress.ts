'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/local-storage';

const STORAGE_KEY_PREFIX = 'reading-progress-';

/**
 * 滚动进度 Hook — 监听页面滚动，返回 0-1 的阅读进度
 * 基于 scrollY / (scrollHeight - clientHeight) 计算
 *
 * 使用 requestAnimationFrame 节流，避免每帧触发 setState 导致大量 re-render
 *
 * 支持持久化：传入 pageKey 时自动保存进度到 localStorage
 * 提供 restorePosition / dismissPosition 回调，合并了原 useContinueReading 的职责
 */
export function useScrollProgress(pageKey?: string): {
  progress: number;
  /** localStorage 中保存的上次阅读位置（0-1），无记录时为 null */
  savedPosition: number | null;
  /** 恢复阅读：平滑滚动到保存的位置并清除记录 */
  restorePosition: (position: number) => void;
  /** 放弃恢复：仅清除保存的记录，不滚动 */
  dismissPosition: () => void;
} {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const [savedPosition, setSavedPosition] = useState<number | null>(() => {
    if (pageKey && typeof window !== 'undefined') {
      const saved = safeGetItem(STORAGE_KEY_PREFIX + pageKey);
      if (saved) {
        const pct = parseFloat(saved);
        if (pct > 0.05 && pct < 0.85) return pct;
      }
    }
    return null;
  });

  const handleScroll = useCallback(() => {
    // 取消上一帧尚未执行的更新，确保每帧最多触发一次 setState
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight <= 0) {
        setProgress(0);
        return;
      }
      const next = Math.min(Math.max(scrollTop / scrollHeight, 0), 1);
      setProgress(next);
    });
  }, []);

  const clearSavedPosition = useCallback(() => {
    if (!pageKey) return;
    safeRemoveItem(STORAGE_KEY_PREFIX + pageKey);
    setSavedPosition(null);
  }, [pageKey]);

  /** 恢复阅读：平滑滚动到保存的位置并清除 localStorage 记录 */
  const restorePosition = useCallback((position: number) => {
    requestAnimationFrame(() => {
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      window.scrollTo({ top: scrollHeight * position, behavior: 'smooth' });
    });
    clearSavedPosition();
  }, [clearSavedPosition]);

  /** 放弃恢复：仅清除 localStorage 记录 */
  const dismissPosition = useCallback(() => {
    clearSavedPosition();
  }, [clearSavedPosition]);

  // 保存进度到 localStorage
  const saveProgress = useCallback(() => {
    if (!pageKey) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) return;
    const pct = scrollTop / scrollHeight;
    // 仅保存 5%~85% 范围内的进度
    if (pct > 0.05 && pct < 0.85) {
      safeSetItem(STORAGE_KEY_PREFIX + pageKey, String(pct));
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      saveProgress();
    };
  }, [handleScroll, saveProgress]);

  return { progress, savedPosition, restorePosition, dismissPosition };
}
