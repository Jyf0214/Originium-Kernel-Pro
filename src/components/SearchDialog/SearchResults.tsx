// SearchResults - 搜索结果列表：单条结果渲染、文本高亮、加载态、键盘选中、分页

'use client';

import React, { useEffect, useRef } from 'react';
import { BookOpen, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { ProCard } from '@/components/ui/ProCard';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/ui';

import type { SearchResult } from './types';

/** 每页显示的结果数量 */
const PAGE_SIZE = 20;

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

// ─── Search Results List (带分页) ──────────────────────────────────────────

interface SearchResultsListProps {
  /** 要显示的结果列表 */
  results: SearchResult[];
  /** 搜索关键词 */
  query: string;
  /** 关闭对话框回调 */
  onClose: () => void;
  /** 键盘导航选中索引 */
  selectedIndex: number;
}

/** 搜索结果列表组件 — 支持分页，超过 PAGE_SIZE 条时显示"查看更多"按钮 */
function SearchResultsList({
  results,
  query,
  onClose,
  selectedIndex,
}: SearchResultsListProps) {
  const [displayCount, setDisplayCount] = React.useState(PAGE_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);

  // 搜索关键词变化时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [query]);

  const visibleResults = results.slice(0, displayCount);
  const hasMore = displayCount < results.length;
  const remainingCount = results.length - displayCount;

  return (
    <div ref={containerRef}>
      {visibleResults.map((result, idx) => (
        <SearchResultItem
          key={result.id}
          result={result}
          query={query}
          onClose={onClose}
          isSelected={selectedIndex === idx}
          flatIndex={idx}
        />
      ))}

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="px-4 py-3">
          <button
            onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ChevronDown size={14} />
            <span>查看更多（还有 {remainingCount} 条）</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { HighlightText, SearchLoading, SearchResultItem, SearchResultsList, SearchResultsSummary };
