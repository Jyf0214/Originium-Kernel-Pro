/**
 * Lightbox 动态加载包装器
 * 使用 next/dynamic 延迟加载灯箱组件，避免首屏打包 motion/react 等重型依赖
 */
import dynamic from 'next/dynamic';
import { LoadingFallback } from '@/components/ui/LoadingFallback';

const Lightbox = dynamic(
  () => import('./Lightbox').then((mod) => ({ default: mod.Lightbox })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
        <LoadingFallback />
      </div>
    ),
  },
);

export { Lightbox };
