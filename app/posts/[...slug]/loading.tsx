import { PostDetailSkeleton } from './_components/PostDetailSkeleton';
import { ProgressBar } from '@/components/Loading/ProgressBar';

/**
 * 文章详情页路由加载态 — 顶部进度条 + 骨架屏
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <ProgressBar />
      <main className="flex-1 max-w-6xl 2xl:max-w-7xl mx-auto w-full px-6 pt-8 pb-16">
        <div className="lg:flex lg:gap-12">
          <PostDetailSkeleton />
        </div>
      </main>
    </div>
  );
}
