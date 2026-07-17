// SearchDialog 搜索状态与快捷键 hook
// 封装：搜索状态、客户端搜索（直接读取 data/search-index.json）、键盘导航、ESC 关闭、body 滚动锁、初始聚焦、搜索历史。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { showError } from '@/lib/error';
import type { SearchGroup, SearchResult } from './types';

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

/** 搜索索引条目类型 */
interface SearchIndexItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
}

/** 模块级索引缓存，避免重复 fetch */
let cachedIndex: SearchIndexItem[] | null = null;
let indexFetchPromise: Promise<SearchIndexItem[]> | null = null;

/** 加载搜索索引（单例 fetch + 缓存） */
async function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (cachedIndex) return cachedIndex;
  if (indexFetchPromise) return indexFetchPromise;

  indexFetchPromise = fetch('/data/search-index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SearchIndexItem[]>;
    })
    .then((data) => {
      cachedIndex = data;
      return data;
    })
    .catch((err) => {
      indexFetchPromise = null;
      throw err;
    });

  return indexFetchPromise;
}

/** 相关性评分（与原 API 逻辑一致） */
function calcRelevance(item: SearchIndexItem, query: string): number {
  const q = query.toLowerCase();
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();

  // 标题完全匹配
  if (title === q) return 100;
  // 标题包含查询词
  if (title.includes(q)) return 80;
  // 标题以查询词开头
  if (title.startsWith(q)) return 70;
  // 标签匹配
  if (item.tags.some((t) => t.toLowerCase().includes(q))) return 60;
  // 描述包含
  if (desc.includes(q)) return 40;
  // 内容包含
  if (item.content.toLowerCase().includes(q)) return 20;

  return 0;
}

/** 客户端搜索（在索引中做字符串匹配） */
function searchLocal(index: SearchIndexItem[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return index
    .map((item) => {
      const score = calcRelevance(item, q);
      if (score === 0) return null;

      // 生成匹配预览：从描述或内容中提取包含查询词的片段
      let matchPreview = '';
      const desc = item.description;
      const content = item.content;
      const lowerDesc = desc.toLowerCase();
      const lowerContent = content.toLowerCase();
      const idx = lowerDesc.indexOf(q);
      if (idx >= 0) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(desc.length, idx + q.length + 60);
        matchPreview = (start > 0 ? '...' : '') + desc.slice(start, end) + (end < desc.length ? '...' : '');
      } else {
        const cIdx = lowerContent.indexOf(q);
        if (cIdx >= 0) {
          const start = Math.max(0, cIdx - 30);
          const end = Math.min(content.length, cIdx + q.length + 60);
          matchPreview = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
        }
      }

      return {
        id: item.slug,
        type: 'post' as const,
        slug: item.slug,
        title: item.title,
        description: item.description,
        tags: item.tags,
        matchPreview,
        score,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score);
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

  // ── 防抖客户端搜索 ──
  const performSearch = useCallback(async (q: string) => {
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
      const index = await loadSearchIndex();
      const matched = searchLocal(index, trimmed);

      setResults(matched);

      // 按类型分组（当前只有 post 类型）
      if (matched.length > 0) {
        setGroups([{ type: 'post', label: '文章', results: matched }]);
      } else {
        setGroups([]);
      }
    } catch (err) {
      setResults([]);
      setGroups([]);
      showError(`搜索索引加载失败：${err instanceof Error ? err.message : '网络异常'}`);
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
