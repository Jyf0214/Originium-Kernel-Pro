/**
 * 自定义 HTML 页面动态路由
 *
 * 路径格式:`/page/<...任意子路径>.html`
 * - 服务端从 WebDAV 的 `pages/` 根读取对应 HTML 文件
 * - 渲染为带沙箱的 iframe(只允许 scripts/forms,不允许同源)
 * - 右上角浮动用户 widget(已登录展示头像,未登录展示「游客」+ 登录入口)
 *
 * 失败行为:
 * - WebDAV 未配置 → 友好提示页(引导补全环境变量)
 * - 路径非法 / 扩展名非 .html/.htm → 404
 * - 文件不存在 / 读取失败 → 404
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isWebDavConfigured } from '@/lib/webdav';
import {
  buildPageRelativePath,
  extractTitle,
  fetchPageHtml,
} from '../_lib/webdav-page';
import { UserWidget } from '../_components/UserWidget';
import { NotConfiguredView } from '../_components/NotConfiguredView';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const relativePath = buildPageRelativePath(path);
  if (!relativePath || !isWebDavConfigured()) {
    return { title: 'Custom Page' };
  }
  const html = await fetchPageHtml(relativePath);
  const title = html ? extractTitle(html) : null;
  return { title: title ?? 'Custom Page' };
}

export default async function CustomPage({ params }: PageProps) {
  const { path } = await params;

  if (!isWebDavConfigured()) {
    return <NotConfiguredView />;
  }

  const relativePath = buildPageRelativePath(path);
  if (!relativePath) {
    notFound();
  }

  const html = await fetchPageHtml(relativePath);
  if (!html) {
    notFound();
  }

  const title = extractTitle(html) ?? 'Custom Page';

  return (
    <div className="relative w-full bg-white">
      <iframe
        srcDoc={html}
        sandbox="allow-scripts allow-forms"
        className="h-screen w-full border-0"
        title={title}
      />
      <UserWidget />
    </div>
  );
}
