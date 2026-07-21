/**
 * 页面骨架屏组件
 *
 * 在路由切换时显示占位骨架，提升感知加载速度。
 * 使用 CSS animation 实现脉冲效果，不依赖 JavaScript。
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 animate-pulse">
      {/* 顶部封面区域骨架 */}
      <div className="h-64 sm:h-80 bg-zinc-200/50 dark:bg-zinc-800/50" />
      {/* 内容区域骨架 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 标题骨架 */}
        <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-3/4" />
        {/* 元信息骨架 */}
        <div className="flex gap-3">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-16" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
        </div>
        {/* 正文骨架 */}
        <div className="space-y-3 mt-8">
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-full" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-5/6" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-4/5" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-full" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-2/3" />
          <div className="h-32 bg-zinc-200/60 dark:bg-zinc-700/60 rounded-xl mt-6" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-full" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-3/4" />
          <div className="h-4 bg-zinc-200/80 dark:bg-zinc-700/80 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}
