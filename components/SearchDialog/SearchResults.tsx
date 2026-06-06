// SearchResults - 搜索结果列表：单条结果渲染、文本高亮、加载态

'use client';

import React from 'react';
import { BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';

import { Tag } from '@/components/ui/Tag';

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
}

/** 单条搜索结果项 */
function SearchResultItem({
  result,
  query,
  onClose,
}: SearchResultItemProps) {
  const href =
    result.type === 'diary' ? result.slug : `/posts${result.slug}`;

  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-start gap-4 px-6 py-3.5 hover:bg-zinc-50 transition-colors rounded-lg mx-2 group"
    >
      {/* 左侧图标 */}
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0 group-hover:bg-zinc-100 transition-colors">
        {result.type === 'diary' ? (
          <BookOpen size={18} className="text-zinc-400" />
        ) : (
          <FileText size={18} className="text-zinc-400" />
        )}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-zinc-900 truncate leading-snug">
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

// ─── Exports ────────────────────────────────────────────────────────────────

export { HighlightText, SearchLoading, SearchResultItem };
