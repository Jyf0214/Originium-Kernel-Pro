'use client';

import { useEffect } from 'react';
import { useScrollProgress } from '@/hooks/use-scroll-progress';

interface ReadingProgressBarProps {
  /** 页面标识，用于持久化阅读进度 */
  pageKey?: string;
  /** 暴露保存的阅读位置和清除函数给父组件 */
  onSavedPosition?: (data: { position: number; clear: () => void } | null) => void;
}

/**
 * 阅读进度条 — 固定在视口顶部的细条，宽度随滚动百分比增长
 * 传入 pageKey 时自动保存进度，但不自动恢复——由父组件通过 onSavedPosition 回调处理恢复逻辑
 */
export function ReadingProgressBar({ pageKey, onSavedPosition }: ReadingProgressBarProps) {
  const { progress, savedPosition, clearSavedPosition } = useScrollProgress(pageKey);

  useEffect(() => {
    if (!onSavedPosition) return;
    if (savedPosition !== null) {
      onSavedPosition({ position: savedPosition, clear: clearSavedPosition });
    } else {
      onSavedPosition(null);
    }
  }, [savedPosition, clearSavedPosition, onSavedPosition]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-zinc-900 transition-[width] duration-100 ease-out"
        style={{ width: `${(progress * 100).toFixed(1)}%` }}
      />
    </div>
  );
}
