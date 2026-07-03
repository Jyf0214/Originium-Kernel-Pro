'use client';

import { motion } from 'motion/react';
import { compactCardVariants, cardVariants, staggerDelay } from '@/components/ui/motion';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { Tag } from '@/components/ui/Tag';
import type { PostItem, CoverConfig } from './types';
import { PostListItemCover } from './PostListItemCover';
import { PostListItemBody } from './PostListItemBody';

export function PostListItem({
  post,
  index,
  coverConfig,
  locale,
  t,
  compact,
}: {
  post: PostItem;
  index: number;
  coverConfig?: CoverConfig;
  locale: string;
  t: (key: string) => string;
  compact?: boolean;
}) {
  const isRowLayout = coverConfig?.position === 'left' || coverConfig?.position === 'right';

  // 紧凑模式：单行展示，无封面，仅标题+标签+日期
  if (compact) {
    return (
      <motion.article
        layout
        variants={compactCardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, delay: staggerDelay(index) }}
        className="group bg-white rounded-none sm:rounded-2xl border-b border-zinc-100 sm:border sm:border-zinc-100 px-4 sm:px-5 py-3 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-100/60 transition-all duration-300"
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
            <h2 className="text-sm font-bold text-zinc-900 truncate group-hover/title:text-zinc-600 transition-colors duration-200">
              {post.title}
            </h2>
          </Link>
          {post.date && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 flex-shrink-0">
              <Calendar size={12} />
              <span>
                {new Date(post.date).toLocaleDateString(locale, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, delay: staggerDelay(index, 0.05) }}
      className={`group bg-white rounded-none sm:rounded-3xl border-b border-zinc-100 sm:border sm:border-zinc-100 overflow-hidden hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-100/80 transition-all duration-500 ${isRowLayout ? 'flex' : 'flex flex-col'}`}
    >
      <PostListItemCover post={post} coverConfig={coverConfig} />
      <PostListItemBody post={post} locale={locale} t={t} />
    </motion.article>
  );
}
