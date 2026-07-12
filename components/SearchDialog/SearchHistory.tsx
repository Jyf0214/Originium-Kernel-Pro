// SearchHistory - 搜索历史列表：展示最近搜索记录，支持清空和点击重搜。

'use client';

import { Clock, Trash2 } from 'lucide-react';

interface SearchHistoryProps {
  history: string[];
  onHistoryClick: (term: string) => void;
  onClear: () => void;
}

export function SearchHistory({ history, onHistoryClick, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          最近搜索
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-zinc-500 transition-colors"
        >
          <Trash2 size={10} />
          清空
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onHistoryClick(term)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Clock size={12} className="text-zinc-300" />
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
