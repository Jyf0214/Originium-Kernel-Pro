/**
 * MarkdownRenderer 动态加载包装器
 * 使用 next/dynamic 延迟加载 react-markdown + katex + remark 等重型依赖
 * 配置 ssr: false 避免服务端打包这些仅客户端使用的库
 */
import dynamic from 'next/dynamic';
import type { MarkdownRendererProps } from './types';

const MarkdownRenderer = dynamic(
  () => import('./index').then((mod) => mod.MarkdownRenderer),
  { ssr: false },
);

export function LazyMarkdownRenderer(props: MarkdownRendererProps) {
  return <MarkdownRenderer {...props} />;
}
