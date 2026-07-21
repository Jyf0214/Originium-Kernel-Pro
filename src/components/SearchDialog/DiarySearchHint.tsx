// DiarySearchHint - 搜索对话框中的日记搜索提示
// 当搜索结果为空或搜索查询较短时，显示日记搜索入口
// 引导用户到日记页面使用内置的搜索和筛选功能

'use client';

import { BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface DiarySearchHintProps {
  query: string;
}

export function DiarySearchHint({ query }: DiarySearchHintProps) {
  // 只在有搜索查询时显示提示
  if (!query || query.trim().length < 1) return null;

  return (
    <div className="mx-4 my-3">
      <Link
        href={`/diary?search=${encodeURIComponent(query)}`}
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-900/20">
          <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            搜索日记内容
          </p>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">
            在日记中搜索「{query}」
          </p>
        </div>
        <ExternalLink size={14} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
      </Link>
    </div>
  );
}
