'use client';

interface CustomPageViewProps {
  html: string;
  title?: string;
}

/**
 * 自定义页面渲染组件
 *
 * 使用 dangerouslySetInnerHTML 渲染用户提供的 HTML 内容。
 */
export default function CustomPageView({ html, title }: CustomPageViewProps) {
  return (
    <>
      {title && <title>{title}</title>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
