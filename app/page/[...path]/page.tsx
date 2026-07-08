import { notFound } from 'next/navigation';
import { buildPageRelativePath, resolvePageFilePath } from '@/lib/page-source/shared';
import { isCustomPagesEnabled } from '@/lib/storage/storage-provider';
import { fetchPageHtml, fetchPageMeta } from '@/lib/page-source/fs';
import { loadConfig } from '@/lib/config';
import CustomPageView from './CustomPageView';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export const dynamic = 'force-dynamic';

export default async function CustomPage({ params }: PageProps) {
  // 实验性功能未启用时直接 404
  if (!isCustomPagesEnabled()) notFound();

  const { path: pathSegments } = await params;

  // 构建相对路径（含目录穿越校验）
  const rawPath = buildPageRelativePath(pathSegments);
  if (!rawPath) notFound();

  // 目录路径 → index.html 解析（如 page/about → page/about/index.html）
  const relativePath = resolvePageFilePath(rawPath);

  // 尝试获取页面内容
  const html = fetchPageHtml(relativePath);
  if (!html) notFound();

  // 获取页面元数据
  const meta = fetchPageMeta(relativePath);

  // 站点标题（用于工具栏显示）
  let siteTitle = 'Originium Kernel';
  try {
    const config = loadConfig();
    if (config.site?.title) siteTitle = config.site.title;
  } catch { /* 使用默认值 */ }

  // 页面路径（用于工单关联）
  const pagePath = '/page/' + pathSegments.join('/');

  return (
    <CustomPageView
      html={html}
      title={meta?.title}
      creator={meta?.creator}
      pagePath={pagePath}
      siteTitle={siteTitle}
    />
  );
}
