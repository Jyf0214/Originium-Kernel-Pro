// SearchFilters - 搜索对话框的筛选控件
// 提供日期范围选择和目录分类筛选功能

'use client';

import { Calendar, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/ui';
import type { SearchFilters as SearchFiltersType } from './use-search';

/** 日期范围选项 */
const DATE_RANGE_OPTIONS: { value: SearchFiltersType['dateRange']; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '30days', label: '30天' },
  { value: '90days', label: '90天' },
  { value: '365days', label: '一年' },
];

interface SearchFiltersProps {
  /** 当前筛选选项 */
  filters: SearchFiltersType;
  /** 日期范围变化回调 */
  onDateRangeChange: (range: SearchFiltersType['dateRange']) => void;
  /** 目录分类变化回调 */
  onCategoryChange: (category: string | null) => void;
  /** 所有可用的目录分类列表 */
  categories: string[];
  /** 是否显示筛选区域（仅在搜索有结果时显示） */
  visible: boolean;
}

export function SearchFilters({
  filters,
  onDateRangeChange,
  onCategoryChange,
  categories,
  visible,
}: SearchFiltersProps) {
  if (!visible) return null;

  return (
    <div className="px-6 py-2 border-b border-zinc-100 dark:border-zinc-700">
      <div className="flex flex-wrap items-center gap-3">
        {/* 日期范围筛选 */}
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-zinc-400" />
          <span className="text-[11px] text-zinc-400">时间:</span>
          <div className="flex gap-1">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onDateRangeChange(option.value)}
                className={cn(
                  'px-2 py-0.5 text-[11px] rounded-md transition-colors',
                  filters.dateRange === option.value
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 目录分类筛选 */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5">
            <FolderOpen size={12} className="text-zinc-400" />
            <span className="text-[11px] text-zinc-400">分类:</span>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => onCategoryChange(null)}
                className={cn(
                  'px-2 py-0.5 text-[11px] rounded-md transition-colors',
                  filters.category === null
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                )}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className={cn(
                    'px-2 py-0.5 text-[11px] rounded-md transition-colors',
                    filters.category === cat
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
