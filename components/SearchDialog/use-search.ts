// SearchDialog 搜索状态与快捷键 hook
// 封装：搜索状态、防抖请求、键盘导航、ESC 关闭、body 滚动锁、初始聚焦、搜索历史。

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
  /** 键盘导航：当前选中结果索引（-1 表示未选中） */
  selectedIndex: number;
  /** 所有扁平化结果（用于键盘导航计算） */
  flatResults: SearchResult[];
  /** 点击搜索历史条目 */
  handleHistoryClick: (term: string) => void;
  /** 清空搜索历史 */
  clearHistory: () => void;
  /** 搜索历史列表 */
  searchHistory: string[];
}

/** 防抖延迟（毫秒） */
const SEARCH_DEBOUNCE_MS = 300;

/** 搜索历史 localStorage key */
const HISTORY_KEY = 'search-history';
/** 最大历史条数 */
const MAX_HISTORY = 5;

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(term: string) {
  if (typeof window === 'undefined') return;
  const history = loadHistory().filter((h) => h !== term);
  history.unshift(term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function useSearch({ open, onClose }: UseSearchOptions): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 所有扁平化结果（用于键盘导航）
  const flatResults = groups.flatMap((g) => g.results);

  // ── 打开时聚焦输入框、加载历史，关闭时重置状态 ──
  useEffect(() => {
    if (open) {
      setSearchHistory(loadHistory());
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
      setResults([]);
      setGroups([]);
      setLoading(false);
      setHasSearched(false);
      setSelectedIndex(-1);
    }
  }, [open]);

  // ── 防抖搜索（AbortController 防止旧请求覆盖新结果） ──
  const performSearch = useCallback(async (q: string, signal?: AbortSignal) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setGroups([]);
      setHasSearched(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSelectedIndex(-1);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
        { signal },
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
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setResults([]);
      setGroups([]);
      showError(`搜索出错：${err instanceof Error ? err.message : '网络异常'}`);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const controller = new AbortController();

    debounceRef.current = setTimeout(() => {
      void performSearch(query, controller.signal);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      controller.abort();
    };
  }, [query, performSearch]);

  // ── 搜索成功后保存历史 ──
  useEffect(() => {
    if (hasSearched && flatResults.length > 0 && query.trim()) {
      saveHistory(query.trim());
      setSearchHistory(loadHistory());
    }
  }, [hasSearched, flatResults.length, query]);

  // ── 键盘导航：↑↓ 选择结果，Enter 跳转，ESC 关闭 ──
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // 仅在有搜索结果时处理方向键
      if (flatResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const target = flatResults[selectedIndex];
        if (target) {
          const href = target.type === 'diary' ? target.slug : `/posts${target.slug}`;
          window.location.href = href;
          onClose();
        }
      }
    };

    const prev = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, flatResults, selectedIndex]);

  // ── 点击搜索历史条目 ──
  const handleHistoryClick = useCallback((term: string) => {
    setQuery(term);
  }, []);

  // ── 清空搜索历史 ──
  const clearHistory = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HISTORY_KEY);
    }
    setSearchHistory([]);
  }, []);

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
    selectedIndex,
    flatResults,
    handleHistoryClick,
    clearHistory,
    searchHistory,
  };
}
