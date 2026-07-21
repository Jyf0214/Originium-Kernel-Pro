// SearchEmpty - 搜索无结果空状态 / 搜索错误状态

'use client';

import { Search, AlertCircle, RefreshCw } from 'lucide-react';

interface SearchEmptyProps {
  query: string;
  /** 搜索错误信息，当索引加载失败时显示 */
  error?: string | null;
  /** 重试回调 */
  onRetry?: () => void;
}

export function SearchEmpty({ query, error, onRetry }: SearchEmptyProps) {
  // 错误状态：搜索索引加载失败
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <p className="text-zinc-500 font-medium">
          搜索功能暂时不可用
        </p>
        <p className="text-zinc-400 text-sm mt-1 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        )}
      </div>
    );
  }

  // 空结果状态
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
        <Search size={24} className="text-zinc-300" />
      </div>
      <p className="text-zinc-500 font-medium">
        未找到与「{query}」相关的内容
      </p>
      <p className="text-zinc-400 text-sm mt-1">请尝试其他关键词或标签</p>
    </div>
  );
}
