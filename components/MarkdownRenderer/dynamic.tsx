/**
 * MarkdownRenderer 动态加载包装器
 * 使用 next/dynamic 延迟加载 react-markdown + katex + remark 等重型依赖
 * 配置 ssr: false 避免服务端打包这些仅客户端使用的库
 */
import dynamic from 'next/dynamic';
import type { MarkdownRendererProps } from './types';

const MarkdownRenderer = dynamic(
  () => import('./index').then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl h-32" />,
  },
);

export function LazyMarkdownRenderer(props: MarkdownRendererProps) {
  return <MarkdownRenderer {...props} />;
}
