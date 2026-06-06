/**
 * /page — 自定义 HTML 页面索引(服务端入口)
 *
 * - 服务端从 WebDAV 的 `pages/` 根浅层扫描(根 + 1 级子目录)
 * - 列出所有 .html/.htm 文件,显示文件名、所在目录、是否私有
 * - 私有判定:`StorageFolder.public` 字段驱动(由 `/admin/storage` 设置)
 * - 私有页面在列表中带锁标,点击仍走 `/page/<path>` 路由,密码提示由原 PasswordPrompt 组件处理
 *
 * 重要:
 * - 此处不继承任何 layout。/page/[...path] 是全屏 iframe,加父 layout 会污染其渲染。
 * - 视图由 PageIndexView 客户端组件渲染,本文件只负责数据获取。
 * - 公开访问,无需登录(与单页面策略一致)。
 */
import 'server-only';
import type { FileStat } from 'webdav';
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav';
import { getDb } from '@/lib/db';
import { splitDirFilename, joinPath } from '@/lib/storage/path';
import { extractTitle, fetchPageHtml, isHtmlPath } from './_lib/webdav-page';
import { PageIndexView, type PageIndexItem } from './_components/PageIndexView';

export const dynamic = 'force-dynamic';

const PAGES_PREFIX = 'pages';
/** 索引最大扫描深度(根 + 1 级子目录 = 2) */
const MAX_LIST_DEPTH = 2;

interface ScannedHtml {
  relativePath: string;
  filename: string;
  dir: string;
}

/**
 * 浅层递归列出 `pages/` 下所有 .html/.htm 文件
 * - 根级 HTML 文件 → depth=1
 * - 1 级子目录下的 HTML 文件 → depth=2
 * - 2 级及更深不再展开(由 navMenu 或手动 URL 进入)
 */
async function scanPagesHtml(): Promise<ScannedHtml[]> {
  if (!isWebDavConfigured()) return [];
  const client = getWebDavClient();
  const out: ScannedHtml[] = [];

  let rootEntries: FileStat[];
  try {
    rootEntries = await client.getDirectoryContents(PAGES_PREFIX, { deep: false });
  } catch (err) {
    console.error('[custom-page-index] list pages/ failed:', err);
    return [];
  }

  for (const entry of rootEntries) {
    if (entry.type === 'file' && isHtmlPath(entry.filename)) {
      const relativePath = joinPath(PAGES_PREFIX, entry.filename);
      const { dir, filename } = splitDirFilename(relativePath);
      out.push({ relativePath, dir, filename });
      continue;
    }
    if (entry.type === 'directory' && MAX_LIST_DEPTH >= 2) {
      const subPath = joinPath(PAGES_PREFIX, entry.filename);
      let subEntries: FileStat[];
      try {
        subEntries = await client.getDirectoryContents(subPath, { deep: false });
      } catch (err) {
        console.error('[custom-page-index] list subdir failed:', subPath, err);
        continue;
      }
      for (const sub of subEntries) {
        if (sub.type === 'file' && isHtmlPath(sub.filename)) {
          const relativePath = joinPath(subPath, sub.filename);
          const { dir, filename } = splitDirFilename(relativePath);
          out.push({ relativePath, dir, filename });
        }
      }
    }
  }

  return out;
}

/**
 * 批量查询若干目录的 StorageFolder 私有元数据
 * - DB 未配置 → 返回空 Set,全部视为公开
 * - 任何目录查询失败 → 视为「无配置」= 公开(失败安全语义)
 */
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
  const notConfigured = !isWebDavConfigured();
  if (notConfigured) {
    return <PageIndexView notConfigured={true} pages={[]} />;
  }

  const scanned = await scanPagesHtml();
  if (scanned.length === 0) {
    return <PageIndexView notConfigured={false} pages={[]} />;
  }

  const privateDirs = await loadPrivateDirs(scanned.map(s => s.dir));

  // 标题提取(每文件独立,失败时降级为文件名)
  const items: PageIndexItem[] = await Promise.all(
    scanned.map(async ({ relativePath, dir, filename }): Promise<PageIndexItem> => {
      let title = filename;
      try {
        const html = await fetchPageHtml(relativePath);
        const extracted = html ? extractTitle(html) : null;
        if (extracted) title = extracted;
      } catch {
        /* 保持 filename */
      }
      // 链接:去掉 pages/ 前缀,直接拼到 /page/<relative-without-prefix>
      // 例如 'pages/about.html' → '/page/about.html'
      //      'pages/blog/post.html' → '/page/blog/post.html'
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

  return <PageIndexView notConfigured={false} pages={items} />;
}
