import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';

interface AdjacentPost {
  slug: string;
  title: string;
  cover?: string;
}

export type { AdjacentPost };

function AdjacentCard({
  post,
  direction,
}: {
  post: AdjacentPost;
  direction: 'prev' | 'next';
}) {
  const isNext = direction === 'next';

  return (
    <Link
      href={`/posts${post.slug}`}
      className="group relative flex flex-col justify-end p-6 rounded-2xl overflow-hidden border border-zinc-800 dark:border-zinc-700 hover:border-zinc-600 dark:hover:border-zinc-500 hover:shadow-xl hover:shadow-zinc-900/20 transition-all duration-300 min-w-0 min-h-[120px] text-right sm:order-last"
    >
      {/* 封面背景图 */}
      {post.cover && (
        <div className="absolute inset-0">
          <LazyImage
            src={post.cover}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:from-black/70 group-hover:via-black/30 transition-colors duration-300" />
        </div>
      )}
      {/* 无封面时保持原有深色背景 */}
      {!post.cover && (
        <div className="absolute inset-0 bg-zinc-900 dark:bg-zinc-800 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-700 transition-colors duration-300" />
      )}

      {/* 内容 */}
      <div className="relative z-10">
        <span className={`flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-3 ${isNext ? 'justify-end' : ''}`}>
          {isNext ? (
            <>
              下一篇
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          ) : (
            <>
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              上一篇
            </>
          )}
        </span>
        <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
          {post.title}
        </span>
      </div>
    </Link>
  );
}

export function PostAdjacent({
  prev,
  next,
}: {
  prev?: AdjacentPost | null;
  next?: AdjacentPost | null;
}) {
  if (!prev && !next) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {prev ? (
        <AdjacentCard post={prev} direction="prev" />
      ) : (
        <div />
      )}
      {next ? (
        <AdjacentCard post={next} direction="next" />
      ) : (
        <div />
      )}
    </div>
  );
}
