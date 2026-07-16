/**
 * LoadingFallback — 通用的骨架屏加载态组件
 * 复用自 MarkdownRenderer 和 LightboxDynamic 的动态加载 fallback
 */
export function LoadingFallback({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl h-32 ${className}`}
    />
  );
}
