'use client';

import { CoverHero } from './PostHeader';

/**
 * 全屏宽封面区域 — 绝对定位突破父容器，真正撑满视口宽度
 * 覆盖在导航栏正后方，导航栏透明时封面直接透出
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
    <div className="absolute top-0 left-0 w-screen h-[56.25vw] max-h-[80vh] min-h-[300px] z-0">
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
