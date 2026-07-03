'use client';

import Script from 'next/script';

interface CustomPageViewProps {
  html: string;
  title?: string;
}

/**
 * 自定义页面渲染组件
 *
 * 使用 dangerouslySetInnerHTML 渲染用户提供的 HTML 内容。
 * 自动注入 page-sdk.js，自定义页面可使用 window.PageSDK 与主系统通信。
 */
export default function CustomPageView({ html, title }: CustomPageViewProps) {
  return (
    <>
      {title && <title>{title}</title>}
      <Script src="/page-sdk.js" strategy="afterInteractive" />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
