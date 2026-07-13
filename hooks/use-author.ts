'use client';

import { useState, useEffect } from 'react';
import type { AuthorInfo } from '@/types/author';

/** 模块级缓存：避免同一页面内多次 fetch /api/authors */
let cachedAuthors: AuthorInfo[] | null = null;
let fetchPromise: Promise<AuthorInfo[]> | null = null;

function fetchAuthorsOnce(): Promise<AuthorInfo[]> {
  if (cachedAuthors) return Promise.resolve(cachedAuthors);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch('/api/authors')
    .then((r) => r.json())
    .then((data) => {
      const list = Array.isArray(data) ? data : [];
      cachedAuthors = list;
      return list;
    })
    .catch(() => {
      // 网络错误时清空 promise 以便下次重试
      fetchPromise = null;
      return [] as AuthorInfo[];
    });
  return fetchPromise;
}

/** 按作者名查找作者信息（客户端 hook，从 /api/authors 获取，带模块级缓存） */
export function useAuthorByName(name: string | undefined): AuthorInfo | null {
  const [authors, setAuthors] = useState<AuthorInfo[]>(() => cachedAuthors ?? []);

  useEffect(() => {
    if (!name) return;
    // 已有缓存直接使用
    if (cachedAuthors) {
      setAuthors(cachedAuthors);
      return;
    }
    void fetchAuthorsOnce().then((list) => {
      setAuthors(list);
    });
  }, [name]);

  if (!name || authors.length === 0) return null;
  return authors.find((a) => a.name === name) ?? null;
}
