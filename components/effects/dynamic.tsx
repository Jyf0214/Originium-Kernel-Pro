'use client';

/**
 * EffectsManager 动态加载包装器
 * 使用 next/dynamic 延迟加载 Canvas 粒子动画等重型视觉效果
 * 在 layout.tsx 中以 ssr: false 避免服务端打包
 */
import dynamic from 'next/dynamic';

const EffectsManager = dynamic(
  () => import('./index').then((mod) => mod.EffectsManager),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl h-32" />,
  },
);

export { EffectsManager };
