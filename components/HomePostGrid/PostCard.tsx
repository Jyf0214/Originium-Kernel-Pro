'use client';

import { motion } from 'motion/react';
import { cardVariants } from '@/components/ui/motion';
import type { PostItem, CoverConfig } from './types';
import { PostCardCover } from './PostCardCover';
import { PostCardBody } from './PostCardBody';

export function PostCard({
  post,
  coverConfig,
  defaultCover,
  t,
  locale,
}: {
  post: PostItem;
  coverConfig?: CoverConfig;
  defaultCover?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  const isSide = coverConfig?.position === 'left' || coverConfig?.position === 'right';
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`group bg-white dark:bg-zinc-900 rounded-none sm:rounded-[2rem] border-0 sm:border-2 border-zinc-50 dark:border-zinc-800 overflow-hidden hover:border-zinc-900 dark:hover:border-zinc-600 transition-all duration-500 shadow-none sm:shadow-sm hover:shadow-2xl hover:shadow-zinc-100 dark:hover:shadow-zinc-900 ${isSide ? 'flex' : 'flex flex-col'}`}
    >
      <PostCardCover post={post} coverConfig={coverConfig} defaultCover={defaultCover} />
      <PostCardBody post={post} t={t} locale={locale} />
    </motion.div>
  );
}
