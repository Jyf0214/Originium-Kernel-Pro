import { Skeleton } from '@/components/ui/Skeleton';

interface PostCardSkeletonProps {
  /** 列表索引：按 index % 3 制造错落的占位宽度，让骨架屏有呼吸感 */
  index?: number;
}

/**
 * 模拟 PostCard 布局的骨架屏，用于首页文章列表加载态
 *
 * 标题/描述占位行宽度随 index 错落（模拟真实文章长短不一的观感），
 * 避免等宽条块的生硬感；index 缺省时使用居中宽度。
 */
export function PostCardSkeleton({ index = 1 }: PostCardSkeletonProps) {
  // 标题行两个宽度档 + 描述行宽度档，均按 index%3 循环错落
  const titleWidths = ['w-4/5', 'w-2/3', 'w-[88%]'];
  const subtitleWidths = ['w-3/5', 'w-1/2', 'w-[70%]'];
  const descWidths = ['w-full', 'w-[92%]', 'w-[96%]'];
  const titleWidth = titleWidths[index % 3];
  const subtitleWidth = subtitleWidths[index % 3];
  const descWidth = descWidths[index % 3];

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border-2 border-zinc-50 dark:border-zinc-700 overflow-hidden shadow-sm">
      {/* 图片区域 */}
      <Skeleton className="w-full aspect-video rounded-none" />
      {/* 内容区域 */}
      <div className="px-5 py-4 flex flex-col gap-3">
        {/* 标签占位 */}
        <div className="flex gap-1.5 mb-1">
          <Skeleton className="w-12 h-5 rounded" />
          <Skeleton className="w-16 h-5 rounded" />
        </div>
        {/* 标题 — 2 行（宽度随 index 错落） */}
        <Skeleton className={`${titleWidth} h-5`} />
        <Skeleton className={`${subtitleWidth} h-5`} />
        {/* 描述 — 1 行 */}
        <Skeleton className={`${descWidth} h-4 mt-1`} />
        {/* 底部元信息 */}
        <div className="mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="w-16 h-3" />
          </div>
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
}
