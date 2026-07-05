'use client';

import { useState, useEffect } from 'react';
import type { AuthorInfo } from '@/types/author';

/** 按作者名查找作者信息（客户端 hook，从 /api/authors 获取） */
export function useAuthorByName(name: string | undefined): AuthorInfo | null {
  const [authors, setAuthors] = useState<AuthorInfo[]>([]);

  useEffect(() => {
    if (!name) return;
    fetch('/api/authors')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAuthors(data); })
      .catch(() => { /* 网络错误静默处理 */ });
  }, [name]);

  if (!name || authors.length === 0) return null;
  return authors.find((a) => a.name === name) ?? null;
}
