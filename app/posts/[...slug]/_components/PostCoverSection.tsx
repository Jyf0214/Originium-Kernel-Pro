'use client';

import { CoverHero } from './PostHeader';

/**
 * 全屏宽封面区域 — 左右撑满视口，向上顶到页面最顶端（导航栏下方）
 * 从卡片容器中抽出，不受 max-width / overflow-hidden / rounded 限制
 */
export function PostCoverSection({
  title,
  author,
  date,
  type,
  tags,
  cover,
}: {
  title: unknown;
  author?: unknown;
  date?: unknown;
  type?: unknown;
  tags?: unknown;
  cover: unknown;
}) {
  const typeStr = typeof type === 'string' && (type === 'original' || type === 'reprint') ? type : undefined;
  const titleStr = typeof title === 'string' ? title : '';
  const authorStr = typeof author === 'string' ? author : undefined;
  const dateStr = typeof date === 'string' ? date : undefined;
  const coverStr = typeof cover === 'string' ? cover : undefined;
  const tagsArr: string[] = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];

  if (!coverStr) return null;

  return (
    <div className="relative w-screen left-[50%] -translate-x-1/2">
      <CoverHero
        titleStr={titleStr}
        authorStr={authorStr}
        dateStr={dateStr}
        typeStr={typeStr}
        tagsArr={tagsArr}
        coverStr={coverStr}
        fullBleed
      />
    </div>
  );
}
