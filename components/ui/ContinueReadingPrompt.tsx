'use client';

import { BookOpen, X } from 'lucide-react';

interface ContinueReadingPromptProps {
  /** 保存的阅读位置（0-1），为 null 时不显示 */
  savedPosition: number | null;
  /** 恢复阅读：跳转到保存的位置 */
  onRestore: (position: number) => void;
  /** 放弃恢复：清除保存的记录，从头阅读 */
  onDismiss: () => void;
}

/**
 * 继续阅读提示条 — 浮动在视口底部，询问用户是否恢复上次阅读位置
 * 仅在检测到有效保存记录时显示
 */
export function ContinueReadingPrompt({ savedPosition, onRestore, onDismiss }: ContinueReadingPromptProps) {
  if (savedPosition === null) return null;

  const pct = Math.round(savedPosition * 100);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.4s_ease-out]">
      <div className="flex items-center gap-3 px-5 py-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-2xl shadow-lg shadow-black/10 dark:shadow-black/30 border border-zinc-200/60 dark:border-zinc-700/60">
        <BookOpen size={18} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
        <span className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
          上次阅读到 {pct}% 处
        </span>
        <button
          type="button"
          onClick={() => onRestore(savedPosition)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors ui-press"
        >
          继续阅读
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ui-press"
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
