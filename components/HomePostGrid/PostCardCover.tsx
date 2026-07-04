import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import type { PostItem, CoverConfig } from './types';

function getCoverPositionClass(position: string | undefined): string {
  if (position === 'right') return 'order-last w-2/5 shrink-0 rounded-r-none sm:rounded-r-[2rem]';
  if (position === 'left') return 'w-2/5 shrink-0 rounded-l-none sm:rounded-l-[2rem]';
  return 'rounded-t-none sm:rounded-t-[2rem]';
}

function PostCardImage({ post, defaultCover }: { post: PostItem; defaultCover?: string }) {
  if (post.cover || defaultCover) {
    return (
      <LazyImage
        src={post.cover ?? defaultCover!}
        alt={post.title}
        fill
        className="group-hover:scale-110 transition-transform duration-700"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 select-none">
      <span className="text-3xl font-bold text-zinc-300 dark:text-zinc-500">{post.title.charAt(0)}</span>
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
  const showCover = (coverConfig?.asideEnable ?? true) && (coverConfig?.indexEnable ?? true);
  if (!showCover) return null;

  const isSide = coverConfig?.position === 'left' || coverConfig?.position === 'right';

  return (
    <div className={`${getCoverPositionClass(coverConfig?.position)} overflow-hidden`}>
      <Link
        href={`/posts${post.slug}`}
        className={`block overflow-hidden bg-zinc-50 dark:bg-zinc-800 relative ${isSide ? 'h-full' : 'aspect-video'}`}
      >
        <PostCardImage post={post} defaultCover={defaultCover} />
        <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/10 transition-colors duration-500" />
        <div className="absolute top-6 right-6 w-12 h-12 bg-white dark:bg-zinc-700 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 shadow-lg">
          <ArrowRight size={24} className="text-zinc-900 dark:text-zinc-100" />
        </div>
      </Link>
    </div>
  );
}
