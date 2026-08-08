import { getContentFiles, getContentIndexes, filterPublicFiles } from '@/lib/content';

/** 清除 Markdown 标记，统计有效字符数 */
export function countChars(text: string): number {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,3}/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

let cachedTotalWordCount: number | null = null;

/**
 * 全站公开文章总字数（wordcount.totalWordcount 展示用）。
 * 构建期内模块级缓存，避免每篇文章重复全站遍历。
 */
export function computeTotalWordCount(): number {
  if (cachedTotalWordCount !== null) return cachedTotalWordCount;
  const posts = filterPublicFiles(getContentFiles('posts'), getContentIndexes('posts'));
  cachedTotalWordCount = posts.reduce((sum, f) => sum + countChars(f.content), 0);
  return cachedTotalWordCount;
}
