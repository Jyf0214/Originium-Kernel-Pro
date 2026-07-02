'use client';

interface CustomPageViewProps {
  html: string;
  title?: string;
}

/**
 * 自定义页面渲染组件
 *
 * 使用 dangerouslySetInnerHTML 渲染用户提供的 HTML 内容。
 * 注意：此组件用于渲染管理员创建的页面，已通过 ACL 权限校验。
 */
export default function CustomPageView({ html, title }: CustomPageViewProps) {
  return (
    <>
      {title && <title>{title}</title>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
