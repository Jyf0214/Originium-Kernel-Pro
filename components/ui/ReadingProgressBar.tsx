'use client';

interface ReadingProgressBarProps {
  /** 当前滚动进度（0-1） */
  progress: number;
}

/**
 * 阅读进度条 — 固定在视口顶部的细条，宽度随滚动百分比增长
 * 纯展示组件，滚动逻辑由 useScrollProgress Hook 在父组件中处理
 */
export function ReadingProgressBar({ progress }: ReadingProgressBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-zinc-900 transition-[width] duration-100 ease-out"
        style={{ width: `${(progress * 100).toFixed(1)}%` }}
      />
    </div>
  );
}
