'use client';

import { CoverHero } from './PostHeader';
import { useMainTone } from '@/hooks/use-main-tone';
import { useConfig } from '@/hooks/use-config';
import type { AuthorInfo } from '@/types/author';

/**
 * 全屏宽封面区域 — 正常文档流，撑满视口宽度
 * 导航栏绝对定位叠加在封面上方，透明渐变
 */

interface CoverSectionProps {
  title: unknown;
  author?: unknown;
  date?: unknown;
  updated?: unknown;
  type?: unknown;
  tags?: unknown;
  cover: unknown;
  authorInfo?: AuthorInfo | null;
}

/** 规整封面 props：unknown 类型收窄为 string/数组 */
function normalizeCoverProps({ title, author, date, updated, type, tags, cover }: CoverSectionProps) {
  return {
    typeStr: typeof type === 'string' && (type === 'original' || type === 'reprint') ? type : undefined,
    titleStr: typeof title === 'string' ? title : '',
    authorStr: typeof author === 'string' ? author : undefined,
    dateStr: typeof date === 'string' ? date : undefined,
    updatedStr: typeof updated === 'string' ? updated : undefined,
    coverStr: typeof cover === 'string' ? cover : undefined,
    tagsArr: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [],
  };
}

export function PostCoverSection(props: CoverSectionProps) {
  const { authorInfo } = props;
  const { typeStr, titleStr, authorStr, dateStr, updatedStr, coverStr, tagsArr } = normalizeCoverProps(props);
  const { config } = useConfig();

  // 主色调：启用 mainTone 时从封面图提取主题色，用于渐变背景与光晕
  const { mainColor } = useMainTone(
    coverStr,
    config?.mainTone?.mode,
    config?.mainTone?.enable,
  );

  // postMeta.post.dateType=both 且有 updated 时，封面日期区显示更新日期
  const showUpdated = config?.postMeta?.post?.dateType === 'both';

  return (
    <div className="w-full animate-cover-fadein">
      <CoverHero
        titleStr={titleStr}
        authorStr={authorStr}
        dateStr={dateStr}
        updatedStr={updatedStr}
        showUpdated={showUpdated}
        typeStr={typeStr}
        tagsArr={tagsArr}
        coverStr={coverStr}
        fullBleed
        authorInfo={authorInfo}
        accentColor={mainColor ?? undefined}
      />
    </div>
  );
}
