import { notFound } from 'next/navigation';
import { buildPageRelativePath, resolvePageFilePath } from '@/lib/page-source/shared';
import { fetchPageHtml, fetchPageMeta } from '@/lib/page-source/fs';
import CustomPageView from './CustomPageView';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export const dynamic = 'force-dynamic';

export default async function CustomPage({ params }: PageProps) {
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

  return <CustomPageView html={html} title={meta?.title} />;
}
