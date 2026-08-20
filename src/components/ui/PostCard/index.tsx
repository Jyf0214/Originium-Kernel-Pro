'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { compactCardVariants, cardVariants, staggerDelay, DURATION } from '@/components/ui/motion';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { Tag } from '@/components/ui/Tag';
import { formatPostDate, resolveDisplayDate } from '@/lib/format-date';
import { useConfig } from '@/hooks/use-config';
import { useVisitedPosts } from '@/hooks/use-visited-posts';
import type { TFunc } from '@/i18n/keys';
import type { PostItem, CoverConfig } from './types';
import type { PostMetaDisplayConfig } from '@/lib/config-types';
import { PostCardCover } from './PostCardCover';
import { PostCardBody } from './PostCardBody';

export type { PostItem, CoverConfig } from './types';

/** 计算封面布局属性 */
function getCoverLayout(coverConfig?: CoverConfig) {
  const isRowLayout = coverConfig?.position === 'left' || coverConfig?.position === 'right';
  const isVerticalCover = !isRowLayout && (coverConfig?.asideEnable ?? true) && (coverConfig?.indexEnable ?? true);
  const borderClass = isVerticalCover
    ? 'relative border border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-400 dark:hover:border-zinc-500'
    : 'border sm:border-2 border-zinc-50 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-600';
  return { isRowLayout, isVerticalCover, borderClass };
}

/** 紧凑模式卡片：单行展示，无封面，仅标题+标签+日期 */
function CompactPostCard({
  post,
  index,
  showTags,
  shownDate,
  showUnread,
  locale,
  t,
  postMeta,
}: {
  post: PostItem;
  index: number;
  showTags: boolean;
  shownDate: string | undefined;
  showUnread: boolean;
  locale: string;
  t: TFunc;
  postMeta?: PostMetaDisplayConfig;
}) {
  return (
    <motion.article
      variants={compactCardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: DURATION.SLOW, delay: staggerDelay(index) }}
      className="group bg-white dark:bg-zinc-800 rounded-2xl sm:rounded-2xl border-b border-zinc-100 dark:border-zinc-700 sm:border sm:border-zinc-100 dark:sm:border-zinc-700 px-4 sm:px-5 py-3 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg hover:shadow-zinc-100 dark:hover:shadow-zinc-900 transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        {showTags && post.tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            {post.tags.slice(0, 2).map((tag) => (
              <Tag key={tag} variant="light" size="md">
                {tag}
              </Tag>
            ))}
          </div>
        )}
        <Link href={`/posts${post.slug}`} className="flex-1 min-w-0 group/title">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover/title:text-zinc-600 dark:group-hover/title:text-zinc-300 transition-colors duration-200 flex items-center gap-1.5">
            {showUnread && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
                aria-label={t('components.PostMetaConfig.unreadMarker')}
              />
            )}
            <span className="truncate">{post.title}</span>
          </h2>
        </Link>
        {shownDate && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
            <Calendar size={12} />
            <span>{formatPostDate(shownDate, locale, postMeta?.dateFormat ?? 'simple')}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export const PostCard = React.memo(function PostCard({
  post,
  index,
  coverConfig,
  defaultCover,
  locale,
  t,
  compact,
  postMeta,
}: {
  post: PostItem;
  index: number;
  coverConfig?: CoverConfig;
  defaultCover?: string;
  locale: string;
  t: TFunc;
  compact?: boolean;
  /** 列表页文章元信息显示配置（postMeta.page） */
  postMeta?: PostMetaDisplayConfig;
}) {
  const { isRowLayout, isVerticalCover, borderClass } = getCoverLayout(coverConfig);
  const showTags = postMeta?.tags ?? true;
  const shownDate = resolveDisplayDate(post.date, post.updated, postMeta?.dateType);

  // 未读标记（postMeta.post.unread）：已访问过的文章不再显示圆点
  const { config } = useConfig();
  const { visited } = useVisitedPosts();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const showUnread = mounted && config?.postMeta?.post?.unread === true && !visited.has(post.slug);

  // 紧凑模式
  if (compact) {
    return (
      <CompactPostCard
        post={post}
        index={index}
        showTags={showTags}
        shownDate={shownDate}
        showUnread={showUnread}
        locale={locale}
        t={t}
        postMeta={postMeta}
      />
    );
  }

  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: DURATION.SLOW, delay: staggerDelay(index, 0.05) }}
      className={`group bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 shadow-none sm:shadow-sm hover:shadow-lg hover:shadow-zinc-100 dark:hover:shadow-zinc-900 ui-interactive ${isRowLayout ? 'flex' : 'flex flex-col'} ${borderClass}`}
    >
      <PostCardCover post={post} coverConfig={coverConfig} defaultCover={defaultCover} />
      <PostCardBody post={post} locale={locale} t={t} position={coverConfig?.position} hasCover={isVerticalCover} postMeta={postMeta} />
    </motion.article>
  );
});
