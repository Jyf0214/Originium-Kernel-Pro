/**
 * /page — 自定义 HTML 页面索引(服务端入口)
 *
 * - 服务端从 WebDAV 扫描 pages/ 目录
 * - 列出所有 .html/.htm 文件,显示文件名、所在目录、是否私有
 * - 私有判定:StorageFolder.public 字段驱动(由 /admin/storage 设置)
 *
 * 行为:
 * - WebDAV 未配置 / 无文件 → 展示「暂无可用页面」空状态卡
 * - WebDAV 有文件 → 正常列出 + 拼接链接
 */
import 'server-only';
import { getDb } from '@/lib/db';
import { PAGES_PREFIX } from '@/lib/page-source/shared';
import { isStorageConfigured } from '@/lib/storage/storage-provider';
import { scanPagesHtmlDeep, fetchPageHtml } from '@/lib/page-source/webdav';
import { PageIndexView, type PageIndexItem } from './_components/PageIndexView';

export const dynamic = 'force-dynamic';

async function loadPrivateDirs(dirs: readonly string[]): Promise<Set<string>> {
  const prisma = getDb().prisma;
  if (!prisma) return new Set();
  const uniqueDirs = Array.from(new Set(dirs.filter(d => d.length > 0)));
  if (uniqueDirs.length === 0) return new Set();
  const privateSet = new Set<string>();
  try {
    const rows = await prisma.storageFolder.findMany({
      where: { path: { in: uniqueDirs } },
      select: { path: true, public: true },
    });
    for (const row of rows) {
      if (!row.public) privateSet.add(row.path);
    }
  } catch (err) {
    console.error('[custom-page-index] load folder meta failed:', err);
  }
  return privateSet;
}

export default async function PageIndex() {
  if (!isStorageConfigured()) {
    return <PageIndexView notConfigured={true} pages={[]} emptyDirs={[]} />;
  }

  let scanned: { relativePath: string }[];
  try {
    scanned = await scanPagesHtmlDeep();
  } catch {
    scanned = [];
  }

  if (scanned.length === 0) {
    return <PageIndexView notConfigured={false} pages={[]} emptyDirs={[]} />;
  }

  const privateDirs = await loadPrivateDirs(
    scanned.map(s => {
      const parts = s.relativePath.split('/');
      return parts.length > 1 ? parts.slice(0, -1).join('/') : PAGES_PREFIX;
    }),
  );

  const items: PageIndexItem[] = await Promise.all(
    scanned.map(async ({ relativePath }): Promise<PageIndexItem> => {
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1] ?? 'index.html';
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : PAGES_PREFIX;

      let title = filename;
      try {
        const html = await fetchPageHtml(relativePath);
        if (html) {
          const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const extracted = match?.[1]?.trim();
          if (extracted) title = extracted;
        }
      } catch {
        /* 保持 filename */
      }

      const href = `/page/${relativePath.slice(PAGES_PREFIX.length + 1)}`;
      return {
        href,
        filename,
        folder: dir.slice(PAGES_PREFIX.length + 1),
        title,
        isPrivate: privateDirs.has(dir),
      };
    }),
  );

  return <PageIndexView notConfigured={false} pages={items} emptyDirs={[]} />;
}
