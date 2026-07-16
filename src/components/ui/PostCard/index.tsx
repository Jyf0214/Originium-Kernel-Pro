'use client';

import { motion } from 'motion/react';
import { compactCardVariants, cardVariants, staggerDelay } from '@/components/ui/motion';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Tag } from '@/components/ui/Tag';
import { formatPostDate } from '@/lib/formatDate';
import type { PostItem, CoverConfig } from './types';
import { PostCardCover } from './PostCardCover';
import { PostCardBody } from './PostCardBody';

export type { PostItem, CoverConfig } from './types';

export const PostCard = React.memo(function PostCard({
  post,
  index,
  coverConfig,
  defaultCover,
  locale,
  t,
  compact,
}: {
  post: PostItem;
  index: number;
  coverConfig?: CoverConfig;
  defaultCover?: string;
  locale: string;
  t: (key: string) => string;
  compact?: boolean;
}) {
  const isRowLayout = coverConfig?.position === 'left' || coverConfig?.position === 'right';

  // 紧凑模式：单行展示，无封面，仅标题+标签+日期
  if (compact) {
    return (
      <motion.article
        variants={compactCardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, delay: staggerDelay(index) }}
        className="group bg-white dark:bg-zinc-800 rounded-2xl sm:rounded-2xl border-b border-zinc-100 dark:border-zinc-700 sm:border sm:border-zinc-100 dark:sm:border-zinc-700 px-4 sm:px-5 py-3 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg hover:shadow-zinc-100 dark:hover:shadow-zinc-900 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          {post.tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              {post.tags.slice(0, 2).map((tag) => (
                <Tag key={tag} variant="light" size="md">
                  {tag}
                </Tag>
              ))}
            </div>
          )}
          <Link href={`/posts${post.slug}`} className="flex-1 min-w-0 group/title">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover/title:text-zinc-600 dark:group-hover/title:text-zinc-300 transition-colors duration-200">
              {post.title}
            </h2>
          </Link>
          {post.date && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
              <Calendar size={12} />
              <span>{formatPostDate(post.date, locale)}</span>
            </div>
          )}
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, delay: staggerDelay(index, 0.05) }}
      className={`group bg-white dark:bg-zinc-800 rounded-2xl sm:rounded-[2rem] border sm:border-2 border-zinc-50 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-600 transition-all duration-500 shadow-none sm:shadow-sm hover:shadow-2xl hover:shadow-zinc-100 dark:hover:shadow-zinc-900 ui-interactive ${isRowLayout ? 'flex' : 'flex flex-col'}`}
    >
      <PostCardCover post={post} coverConfig={coverConfig} defaultCover={defaultCover} />
      <PostCardBody post={post} locale={locale} t={t} position={coverConfig?.position} />
    </motion.article>
  );
});
