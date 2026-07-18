'use client';

import { CoverHero } from './PostHeader';
import type { AuthorInfo } from '@/types/author';

/**
 * 全屏宽封面区域 — 正常文档流，撑满视口宽度
 * 导航栏绝对定位叠加在封面上方，透明渐变
 */
export function PostCoverSection({
  title,
  author,
  date,
  type,
  tags,
  cover,
  authorInfo,
}: {
  title: unknown;
  author?: unknown;
  date?: unknown;
  type?: unknown;
  tags?: unknown;
  cover: unknown;
  authorInfo?: AuthorInfo | null;
}) {
  const typeStr = typeof type === 'string' && (type === 'original' || type === 'reprint') ? type : undefined;
  const titleStr = typeof title === 'string' ? title : '';
  const authorStr = typeof author === 'string' ? author : undefined;
  const dateStr = typeof date === 'string' ? date : undefined;
  const coverStr = typeof cover === 'string' ? cover : undefined;
  const tagsArr: string[] = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  return (
    <div className="w-full animate-cover-fadein">
      <CoverHero
        titleStr={titleStr}
        authorStr={authorStr}
        dateStr={dateStr}
        typeStr={typeStr}
        tagsArr={tagsArr}
        coverStr={coverStr}
        fullBleed
        authorInfo={authorInfo}
      />
    </div>
  );
}
