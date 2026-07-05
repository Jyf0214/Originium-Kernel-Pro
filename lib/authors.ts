import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { AuthorInfo } from '@/types/author';

const AUTHORS_PATH = path.join(process.cwd(), 'authors', 'authors.yaml');

let cachedAuthors: AuthorInfo[] | null = null;

/** 清除缓存，使下次 getAuthors() 重新加载 */
export function clearAuthorsCache(): void {
  cachedAuthors = null;
}

/** 加载作者列表（同步，构建时/服务端使用） */
export function getAuthors(): AuthorInfo[] {
  if (cachedAuthors) return cachedAuthors;

  if (!fs.existsSync(AUTHORS_PATH)) {
    cachedAuthors = [];
    return cachedAuthors;
  }

  const raw = fs.readFileSync(AUTHORS_PATH, 'utf-8');
  const data = yaml.load(raw);

  if (!Array.isArray(data)) {
    cachedAuthors = [];
    return cachedAuthors;
  }

  cachedAuthors = data
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && typeof item.name === 'string')
    .map((item) => ({
      name: item.name as string,
      nickname: typeof item.nickname === 'string' ? item.nickname : undefined,
      avatar: typeof item.avatar === 'string' ? item.avatar : undefined,
      location: typeof item.location === 'string' ? item.location : undefined,
      bio: typeof item.bio === 'string' ? item.bio : undefined,
    }));

  return cachedAuthors;
}

/** 根据作者名查找作者信息，未找到返回 null */
export function getAuthorByName(name: string): AuthorInfo | null {
  if (!name) return null;
  const authors = getAuthors();
  return authors.find((a) => a.name === name) ?? null;
}
