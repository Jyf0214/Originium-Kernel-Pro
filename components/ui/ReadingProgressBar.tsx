'use client';

import { useScrollProgress } from '@/hooks/use-scroll-progress';

interface ReadingProgressBarProps {
  /** 页面标识，用于持久化阅读进度 */
  pageKey?: string;
}

/**
 * 阅读进度条 — 固定在视口顶部的细条，宽度随滚动百分比增长
 * 传入 pageKey 时自动保存/恢复阅读位置
 */
export function ReadingProgressBar({ pageKey }: ReadingProgressBarProps) {
  const progress = useScrollProgress(pageKey);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-zinc-900 transition-[width] duration-100 ease-out"
        style={{ width: `${(progress * 100).toFixed(1)}%` }}
      />
    </div>
  );
}
