'use client';

import type { AuthorInfo } from '@/types/author';

/**
 * 静态博客版：作者信息由构建时传入 props，无需运行时 fetch。
 * 此 hook 保留接口兼容性，始终返回 null。
 */
export function useAuthorByName(_name: string | undefined): AuthorInfo | null {
  return null;
}
