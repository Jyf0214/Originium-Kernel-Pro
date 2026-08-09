'use client';

import { useCallback, useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/local-storage';

const STORAGE_KEY = 'visited-posts';
const MAX_VISITED = 200;

/** 读取已访问文章 slug 集合 */
function readVisited(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/**
 * 已访问文章跟踪 Hook — 支撑列表页"未读标记"（postMeta.post.unread）
 * 文章详情页挂载时调用 markVisited 记录访问，列表页读取 visited 判断未读。
 * 记录有上限（MAX_VISITED），超出时丢弃最早访问记录，避免 localStorage 无限增长。
 */
export function useVisitedPosts(): {
  visited: Set<string>;
  markVisited: (slug: string) => void;
} {
  const [visited, setVisited] = useState<Set<string>>(() => readVisited());

  const markVisited = useCallback((slug: string) => {
    setVisited((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      while (next.size > MAX_VISITED) {
        const first = next.values().next().value;
        if (first === undefined) break;
        next.delete(first);
      }
      safeSetItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setVisited(readVisited());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { visited, markVisited };
}