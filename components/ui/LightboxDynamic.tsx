/**
 * Lightbox 动态加载包装器
 * 使用 next/dynamic 延迟加载灯箱组件，避免首屏打包 motion/react 等重型依赖
 */
import dynamic from 'next/dynamic';

const Lightbox = dynamic(
  () => import('./Lightbox').then((mod) => ({ default: mod.Lightbox })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
        <div className="animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl h-32" />
      </div>
    ),
  },
);

export { Lightbox };
