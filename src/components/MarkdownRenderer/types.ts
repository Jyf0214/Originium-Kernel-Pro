import type { ReactNode } from 'react';

/** 代码块高亮配置 */
export interface HighlightConfig {
  theme: string;
  copy: boolean;
  lang: boolean;
  shrink: boolean;
  heightLimit: number;
  wordWrap: boolean;
  lineNumbers?: boolean;
}

/** Wiki-link 标题解析映射（小写标题 → URL） */
export type WikiLinkMap = Record<string, { url: string; title: string }>;

/** MarkdownRenderer 组件 props */
export interface MarkdownRendererProps {
  content: string;
  highlight?: HighlightConfig;
  /** 可选：wiki-link 标题解析映射，启用后 [[标题]] 会转为可点击链接 */
  wikiLinkMap?: WikiLinkMap;
  /** 可选：图片水印文字，传入后每张图片右下角显示半透明水印 */
  watermark?: string;
}

/** markdown 渲染器透传给组件的通用 props */
export interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}
