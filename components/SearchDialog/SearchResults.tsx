// SearchResults - 搜索结果列表：单条结果渲染、文本高亮、加载态、键盘选中

'use client';

import React, { useEffect, useRef } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

import { ProCard } from '@/components/ui/ProCard';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/ui';

import type { SearchResult } from './types';

// ─── Highlight Text ─────────────────────────────────────────────────────────

/** 转义正则特殊字符 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 高亮匹配文本片段 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) {
    return <>{text}</>;
  }

  try {
    const escaped = escapeRegExp(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span
              key={i}
              className="text-amber-600 bg-amber-50 rounded-sm px-0.5 font-medium"
            >
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

// ─── Search Result Item ─────────────────────────────────────────────────────

interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  onClose: () => void;
  /** 键盘导航选中状态 */
  isSelected?: boolean;
  /** 在扁平结果列表中的索引（用于滚动到可视区域） */
  flatIndex?: number;
}

/** 单条搜索结果项 — 使用 ProCard 包裹实现卡片化悬停效果 */
function SearchResultItem({
  result,
  query,
  onClose,
  isSelected,
  flatIndex,
}: SearchResultItemProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const href =
    result.type === 'diary' ? result.slug : `/posts${result.slug}`;

  // 选中时自动滚动到可视区域
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <ProCard
      hoverable
      bordered={false}
      padding="p-0"
      className={cn(
        'mx-2',
        isSelected && 'bg-zinc-100 dark:bg-zinc-800',
      )}
    >
      <Link
        ref={ref}
        href={href}
        onClick={onClose}
        data-result-index={flatIndex}
        className="flex items-start gap-4 px-6 py-3.5 group"
      >
        {/* 左侧图标 */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
          isSelected ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-zinc-50 group-hover:bg-zinc-100',
        )}>
          {result.type === 'diary' ? (
            <BookOpen size={18} className={isSelected ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'} />
          ) : (
            <FileText size={18} className={isSelected ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'} />
          )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold truncate leading-snug text-zinc-900 dark:text-zinc-100">
            <HighlightText text={result.title} query={query} />
          </h4>
          {result.matchPreview && (
            <p className="text-sm text-zinc-400 mt-0.5 line-clamp-1 leading-relaxed">
              <HighlightText text={result.matchPreview} query={query} />
            </p>
          )}
          {result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {result.tags.slice(0, 3).map((tag) => (
                <Tag key={tag} variant="light" size="sm">{tag}</Tag>
              ))}
            </div>
          )}
        </div>
      </Link>
    </ProCard>
  );
}

// ─── Search Loading ─────────────────────────────────────────────────────────

/** 加载状态：旋转指示器 */
function SearchLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  );
}

// ─── Search Results Summary ──────────────────────────────────────────────────

interface SearchResultsSummaryProps {
  totalResults: number;
  query: string;
}

/** 搜索结果计数摘要 */
function SearchResultsSummary({ totalResults, query }: SearchResultsSummaryProps) {
  if (!query || totalResults === 0) return null;
  return (
    <div className="px-6 py-2">
      <p className="text-[11px] text-zinc-400">
        找到 <span className="font-medium text-zinc-500">{totalResults}</span> 条与
        「<span className="font-medium text-zinc-500">{query}</span>」相关的结果
      </p>
    </div>
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { HighlightText, SearchLoading, SearchResultItem, SearchResultsSummary };
