/**
 * 「自定义 HTML 页面」运行时 — 本地 fs 读取层
 *
 * 用途:
 * - 替代原先的运行时 WebDAV 读取(`app/page/_lib/webdav-page.ts`)
 * - 数据源改为项目根 `./pages/` 目录,该目录由 `scripts/sync-pages.mjs`
 *   在 build 阶段从 WebDAV 完整镜像下来
 * - 私有页面密码 ACL 仍走 `lib/storage/acl.ts` 的 `checkPageAccess`(Prisma)
 *
 * 设计要点:
 * - 用 `'server-only'` 标记,严禁被打包到客户端
 * - 路径基准:`path.join(process.cwd(), 'pages', relativePath)`
 *   - `process.cwd()` 在 `next build` / `next start` 下指向项目根
 *   - `./pages/` 已在 `.gitignore` 忽略,不会被提交
 * - 与 `lib/page-source/webdav.ts` 接口语义对齐,便于上层无感切换
 */
import 'server-only';
import { promises as fs, type Dirent } from 'fs';
import path from 'path';
import { PAGES_PREFIX, isHtmlPath, extractTitle } from '@/lib/page-source/shared';
import { fetchPageHtml, scanPagesHtmlDeep } from '@/lib/page-source/webdav';

/** 本地镜像目录绝对路径(项目根的 `./pages/`) */
const LOCAL_PAGES_DIR = path.join(process.cwd(), PAGES_PREFIX);

/** 同步脚本对 `pages/` 做的最大深度(根 + 1 级子目录 = 2) */
const MAX_SCAN_DEPTH = 2;

export interface ScannedLocalPage {
  relativePath: string;
  dir: string;
  filename: string;
  size: number;
  lastModified: string;
}

/**
 * 读取 HTML 文件内容：本地优先，不存在时从 WebDAV 运行时读取
 *
 * - 本地文件存在 → 直接读取（快速）
 * - 本地不存在 → fallback 到 WebDAV getFileContents（新建页面首次访问）
 * - 两者都不存在 → 返回 `null`
 * - 其它读取错误 → 抛给上层
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的相对路径(含 `pages/` 前缀)
 */
export async function readPageHtml(relativePath: string): Promise<string | null> {
  const absolutePath = path.join(LOCAL_PAGES_DIR, relativePath);
  try {
    const content = await fs.readFile(absolutePath, 'utf8');
    return content;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') throw err;
  }
  // 本地不存在 → 从 WebDAV 运行时读取
  return fetchPageHtml(relativePath);
}

/**
 * 检查某个相对路径对应的本地 HTML 文件是否存在
 *
 * - 主要供 `app/page/[...path]/page.tsx` 的存在性快速判定
 * - 与 `readPageHtml` 不同:这里用 `stat`,不会把文件读入内存
 */
export async function isLocalPageAvailable(relativePath: string): Promise<boolean> {
  const absolutePath = path.join(LOCAL_PAGES_DIR, relativePath);
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * 判断是否有任何可用页面(本地 + WebDAV)
 *
 * - 本地有文件 → false（非空）
 * - 本地为空但 WebDAV 有页面 → false（新建页面运行时可见）
 * - 两者都空 → true
 */
export async function isLocalPagesEmpty(): Promise<boolean> {
  try {
    const entries = await fs.readdir(LOCAL_PAGES_DIR);
    if (entries.length > 0) return false;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') throw err;
    // 本地目录不存在，继续检查 WebDAV
  }
  // 本地为空/不存在 → 检查 WebDAV
  try {
    const webdavPages = await scanPagesHtmlDeep();
    return webdavPages.length === 0;
  } catch {
    return true; // WebDAV 也不可用
  }
}

/**
 * 单层 `readdir`:目录不存在返回 `[]`,其它错误抛给上层
 */
async function safeReaddir(dir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * 扫描本地 ./pages/ 中没有 HTML 文件的子目录
 * 返回目录名列表（如 ['hello-world', 'my-project']）
 */
export async function scanEmptyDirs(): Promise<string[]> {
  const out: string[] = [];
  const rootEntries = await safeReaddir(LOCAL_PAGES_DIR);
  for (const entry of rootEntries) {
    if (entry.isDirectory()) {
      const subEntries = await safeReaddir(path.join(LOCAL_PAGES_DIR, entry.name));
      const hasHtml = subEntries.some((s) => s.isFile() && isHtmlPath(s.name));
      if (!hasHtml) out.push(entry.name);
    }
  }
  return out;
}

/**
 * 浅层递归扫描本地 + WebDAV,收集所有 .html/.htm 页面
 *
 * - 本地 ./pages/ 优先(构建时同步,快速)
 * - WebDAV 补充(新建页面可能仅存在于 WebDAV,尚未同步到本地)
 * - 相对路径重复时本地优先(WebDAV 条目被跳过)
 */
export async function scanLocalPagesHtml(): Promise<ScannedLocalPage[]> {
  const out: ScannedLocalPage[] = [];
  const seenPaths = new Set<string>();

  // 1. 扫描本地 ./pages/
  const rootEntries = await safeReaddir(LOCAL_PAGES_DIR);
  for (const entry of rootEntries) {
    if (entry.isFile() && isHtmlPath(entry.name)) {
      const filename = entry.name;
      const relativePath = `${PAGES_PREFIX}/${filename}`;
      const stat = await fs.stat(path.join(LOCAL_PAGES_DIR, filename));
      out.push({
        relativePath,
        dir: PAGES_PREFIX,
        filename,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
      });
      seenPaths.add(relativePath);
      continue;
    }
    if (entry.isDirectory() && MAX_SCAN_DEPTH >= 2) {
      const subAbs = path.join(LOCAL_PAGES_DIR, entry.name);
      const subEntries = await safeReaddir(subAbs);
      for (const sub of subEntries) {
        if (sub.isFile() && isHtmlPath(sub.name)) {
          const filename = sub.name;
          const relativePath = `${PAGES_PREFIX}/${entry.name}/${filename}`;
          const stat = await fs.stat(path.join(subAbs, filename));
          out.push({
            relativePath,
            dir: `${PAGES_PREFIX}/${entry.name}`,
            filename,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          });
          seenPaths.add(relativePath);
        }
      }
    }
  }

  // 2. 补充 WebDAV 上存在但本地没有的页面(新建页面运行时可见)
  try {
    const webdavPages = await scanPagesHtmlDeep();
    for (const { relativePath } of webdavPages) {
      if (seenPaths.has(relativePath)) continue;
      // 从相对路径提取目录和文件名
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1] ?? '';
      const dir = parts.slice(0, -1).join('/');
      out.push({
        relativePath,
        dir,
        filename,
        size: 0, // WebDAV 未提供 size,标记为 0
        lastModified: new Date().toISOString(),
      });
    }
  } catch {
    // WebDAV 不可用或扫描失败,不阻断(本地结果已足够)
  }

  return out;
}

/**
 * 在 server component 中提取页面标题(读取 → 解析 title 标签)
 *
 * - 文件不存在 / 读取失败 → 返回 `null`,由调用方降级为文件名
 * - 单独抽出来以复用读取 + 解析的样板
 */
export async function readPageTitle(relativePath: string): Promise<string | null> {
  const html = await readPageHtml(relativePath);
  if (!html) return null;
  return extractTitle(html);
}
