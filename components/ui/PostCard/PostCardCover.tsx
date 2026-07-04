'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import type { PostItem, CoverConfig } from './types';

function getCoverPositionClass(position: string | undefined): string {
  if (position === 'right') return 'order-last w-2/5 shrink-0 sm:rounded-r-[2rem] overflow-hidden';
  if (position === 'left') return 'w-2/5 shrink-0 sm:rounded-l-[2rem] overflow-hidden';
  return 'sm:rounded-t-[2rem] overflow-hidden';
}

function PostCardImage({ post, defaultCover, position }: { post: PostItem; defaultCover?: string; position?: string }) {
  const imageRoundClass =
    position === 'right' ? 'sm:rounded-r-[2rem]' :
    position === 'left' ? 'sm:rounded-l-[2rem]' :
    'sm:rounded-t-[2rem]';

  if (post.cover || defaultCover) {
    return (
      <LazyImage
        src={post.cover ?? defaultCover!}
        alt={post.title}
        fill
        className={`object-cover group-hover:scale-110 transition-transform duration-700 rounded-none ${imageRoundClass}`}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-700 dark:to-zinc-800 select-none">
      <span className="text-5xl font-black text-zinc-200 dark:text-zinc-500 group-hover:text-zinc-300 dark:group-hover:text-zinc-400 transition-colors duration-500">
        {post.title.charAt(0)}
      </span>
    </div>
  );
}

export function PostCardCover({
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
  const isRowLayout = position === 'left' || position === 'right';

  const linkRoundClass =
    position === 'right' ? 'sm:rounded-r-[2rem]' :
    position === 'left' ? 'sm:rounded-l-[2rem]' :
    'sm:rounded-t-[2rem]';

  return (
    <div className={`${getCoverPositionClass(position)} relative`}>
      <Link
        href={`/posts${post.slug}`}
        className={`block overflow-hidden bg-zinc-50 dark:bg-zinc-800 relative ui-interactive ${linkRoundClass} ${isRowLayout ? 'h-full' : 'aspect-video'}`}
      >
        <PostCardImage post={post} defaultCover={defaultCover} position={position} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-zinc-700/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
          <ArrowUpRight size={18} className="text-zinc-900 dark:text-zinc-100" />
        </div>
      </Link>
    </div>
  );
}
