// SearchDialog 搜索状态与快捷键 hook
// 封装：搜索状态、防抖请求、ESC 关闭、body 滚动锁、初始聚焦、热门标签点击。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { showError } from '@/lib/error';
import type { SearchGroup, SearchResponse, SearchResult } from './types';

export interface UseSearchOptions {
  /** 对话框是否打开 */
  open: boolean;
  /** 关闭对话框回调（用于 ESC 键） */
  onClose: () => void;
}

export interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  groups: SearchGroup[];
  loading: boolean;
  hasSearched: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** 点击热门标签后自动填入搜索框 */
  handleTagClick: (tag: string) => void;
}

/** 防抖延迟（毫秒） */
const SEARCH_DEBOUNCE_MS = 300;

export function useSearch({ open, onClose }: UseSearchOptions): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 打开时聚焦输入框，关闭时重置状态 ──
  useEffect(() => {
    if (open) {
      // 延迟聚焦以确保动画完成后生效
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
      setResults([]);
      setGroups([]);
      setLoading(false);
      setHasSearched(false);
    }
  }, [open]);

  // ── 防抖搜索 ──
  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setGroups([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
      );
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.results ?? []);
        setGroups(data.groups ?? []);
      } else {
        setResults([]);
        setGroups([]);
        showError(`搜索请求失败（HTTP ${res.status}）`);
      }
    } catch (err) {
      setResults([]);
      setGroups([]);
      showError(`搜索出错：${err instanceof Error ? err.message : '网络异常'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void performSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // ── ESC 关闭 + 锁滚动 ──
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const prev = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // ── 点击热门标签 ──
  const handleTagClick = useCallback((tag: string) => {
    setQuery(tag);
  }, []);

  return {
    query,
    setQuery,
    results,
    groups,
    loading,
    hasSearched,
    inputRef,
    handleTagClick,
  };
}
