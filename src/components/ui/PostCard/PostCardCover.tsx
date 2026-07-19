import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import type { PostItem, CoverConfig } from './types';

function PostCardImage({ post, defaultCover }: { post: PostItem; defaultCover?: string }) {
  if (post.cover || defaultCover) {
    return (
      <LazyImage
        src={post.cover ?? defaultCover!}
        alt={post.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-700"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    );
  }
  return null;
}

export const PostCardCover = React.memo(function PostCardCover({
  post,
  coverConfig,
  defaultCover,
}: {
  post: PostItem;
  coverConfig?: CoverConfig;
  defaultCover?: string;
}) {
  const coverAside = coverConfig?.asideEnable ?? true;
  const coverIndex = coverConfig?.indexEnable ?? true;
  if (!coverAside || !coverIndex) return null;

  const position = coverConfig?.position;
  const isVerticalCover = position === 'top' || !position;

  // 纵向布局：图片 absolute 填满整个卡片，作为背景
  if (isVerticalCover) {
    return (
      <div className="absolute inset-0 z-0">
        <Link
          href={`/posts${post.slug}`}
          className="block w-full h-full overflow-hidden relative ui-interactive"
        >
          <PostCardImage post={post} defaultCover={defaultCover} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-zinc-700/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg z-10">
            <ArrowUpRight size={18} className="text-zinc-900 dark:text-zinc-100" />
          </div>
        </Link>
      </div>
    );
  }

  // 横向布局（左/右）：保持原有 flex 内联样式
  const coverPosClass = position === 'right'
    ? 'order-last w-2/5 shrink-0 rounded-r-2xl sm:rounded-r-[2rem] overflow-hidden'
    : 'w-2/5 shrink-0 rounded-l-2xl sm:rounded-l-[2rem] overflow-hidden';
  const linkRoundClass = position === 'right'
    ? 'rounded-r-2xl sm:rounded-r-[2rem]'
    : 'rounded-l-2xl sm:rounded-l-[2rem]';

  return (
    <div className={`${coverPosClass} relative`}>
      <Link
        href={`/posts${post.slug}`}
        className={`block overflow-hidden bg-zinc-50 dark:bg-zinc-800 relative ui-interactive ${linkRoundClass} h-full`}
      >
        <PostCardImage post={post} defaultCover={defaultCover} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-zinc-700/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
          <ArrowUpRight size={18} className="text-zinc-900 dark:text-zinc-100" />
        </div>
      </Link>
    </div>
  );
});
