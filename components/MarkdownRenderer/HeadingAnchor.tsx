import React from 'react';
import type { CodeProps } from './types';

/** 从 React children 中提取纯文本，用于生成标题 id */
export function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map((child) => extractTextContent(child)).join('');
  }
  if (React.isValidElement(children)) {
    return extractTextContent((children.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/** 将文本转为适合作为 id 的 slug */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'heading'
  );
}

/** 创建带锚点 id 的标题组件 */
export function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const tag = `h${level}`;
  return function Heading({ children, node: _node, inline: _inline, ...props }: CodeProps) {
    const id = slugify(extractTextContent(children));
    return React.createElement(tag, { id, ...props }, children);
  };
}
