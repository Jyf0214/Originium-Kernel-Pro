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
  /** 当前筛选选项 */
  filters: SearchFilters;
  /** 设置日期范围筛选 */
  setDateRange: (range: SearchFilters['dateRange']) => void;
  /** 设置目录分类筛选 */
  setCategory: (category: string | null) => void;
  /** 所有可用的目录分类列表 */
  availableCategories: string[];
  /** 搜索错误信息（索引加载失败时） */
  searchError: string | null;
  /** 重试搜索 */
  retrySearch: () => void;
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

/** 搜索筛选选项 */
export interface SearchFilters {
  /** 日期范围：'all' | '30days' | '90days' | '365days' */
  dateRange: 'all' | '30days' | '90days' | '365days';
  /** 目录分类筛选：null 表示全部 */
  category: string | null;
}

/** 从 slug 中提取目录分类（第一级路径） */
function extractCategory(slug: string): string {
  // slug 格式: /分类/文章名 或 /分类/子分类/文章名
  const parts = slug.replace(/^\//, '').split('/');
  return parts[0] ?? '其他';
}

/** 判断条目是否在日期范围内 */
function _isInDateRange(item: SearchIndexItem, dateRange: SearchFilters['dateRange']): boolean {
  if (dateRange === 'all') return true;

  // 尝试从 slug 中提取日期（格式: /daily/2024-01-15）
  const dateMatch = item.slug.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch?.[1]) return true; // 无法识别日期的条目始终显示

  const itemDate = new Date(dateMatch[1]);
  const now = new Date();
  const diffMs = now.getTime() - itemDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (dateRange) {
    case '30days': return diffDays <= 30;
    case '90days': return diffDays <= 90;
    case '365days': return diffDays <= 365;
    default: return true;
  }
}

/** 模块级索引缓存，避免重复 fetch */
let cachedIndex: SearchIndexItem[] | null = null;
let indexFetchPromise: Promise<SearchIndexItem[]> | null = null;

/** 搜索索引的备用 URL 列表（降级策略） */
const SEARCH_INDEX_URLS = [
  '/data/search-index.json',
  '/api/search-index',
];

/** 从指定 URL 加载搜索索引 */
async function fetchSearchIndex(url: string): Promise<SearchIndexItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SearchIndexItem[]>;
}

/** 加载搜索索引（单例 fetch + 缓存 + 降级策略） */
async function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (cachedIndex) return cachedIndex;
  if (indexFetchPromise) return indexFetchPromise;

  indexFetchPromise = (async () => {
    // 依次尝试各个 URL
    for (const url of SEARCH_INDEX_URLS) {
      try {
        const data = await fetchSearchIndex(url);
        cachedIndex = data;
        return data;
      } catch {
        // 当前 URL 失败，尝试下一个
        continue;
      }
    }
    // 所有 URL 都失败
    throw new Error('搜索索引加载失败：所有备用地址均不可用');
  })();

  return indexFetchPromise.catch((err) => {
    indexFetchPromise = null;
    throw err;
  });
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
  const [filters, setFilters] = useState<SearchFilters>({ dateRange: 'all', category: null });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 所有扁平化结果（用于键盘导航）
  const flatResults = groups.flatMap((g) => g.results);

  // ── 打开时聚焦输入框、加载历史，关闭时重置状态 ──
  useEffect(() => {
    if (open) {
      setSearchHistory(loadHistory());
      setSearchError(null);
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
      setSearchError(null);
    }
  }, [open]);

  // ── 防抖客户端搜索 ──
  const performSearch = useCallback(async (q: string, currentFilters: SearchFilters) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setGroups([]);
      setHasSearched(false);
      setSelectedIndex(-1);
      setSearchError(null);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSelectedIndex(-1);
    setSearchError(null);

    try {
      const index = await loadSearchIndex();

      // 提取所有可用的目录分类
      const categories = new Set<string>();
      for (const item of index) {
        const cat = extractCategory(item.slug);
        categories.add(cat);
      }
      setAvailableCategories(Array.from(categories).sort());

      // 应用搜索和筛选
      let matched = searchLocal(index, trimmed);

      // 应用日期范围筛选
      if (currentFilters.dateRange !== 'all') {
        matched = matched.filter((r) => {
          // 从 SearchResult 的 slug 中判断日期
          const dateMatch = r.slug.match(/(\d{4}-\d{2}-\d{2})/);
          if (!dateMatch?.[1]) return true; // 无法识别日期的结果始终保留
          const itemDate = new Date(dateMatch[1]);
          const now = new Date();
          const diffMs = now.getTime() - itemDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          switch (currentFilters.dateRange) {
            case '30days': return diffDays <= 30;
            case '90days': return diffDays <= 90;
            case '365days': return diffDays <= 365;
            case 'all': return true;
          }
        });
      }

      // 应用目录分类筛选
      if (currentFilters.category) {
        matched = matched.filter((r) => {
          const cat = extractCategory(r.slug);
          return cat === currentFilters.category;
        });
      }

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
      const errorMsg = err instanceof Error ? err.message : '网络异常';
      setSearchError(errorMsg);
      showError(`搜索索引加载失败：${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void performSearch(query, filters);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, filters, performSearch]);

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

  // ── 设置日期范围筛选 ──
  const setDateRange = useCallback((range: SearchFilters['dateRange']) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  }, []);

  // ── 设置目录分类筛选 ──
  const setCategory = useCallback((category: string | null) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  // ── 重试搜索 ──
  const retrySearch = useCallback(() => {
    setSearchError(null);
    if (query.trim()) {
      void performSearch(query, filters);
    }
  }, [query, filters, performSearch]);

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
    filters,
    setDateRange,
    setCategory,
    availableCategories,
    searchError,
    retrySearch,
  };
}
