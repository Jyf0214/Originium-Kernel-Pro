/**
 * 「自定义 HTML 页面」服务端辅助函数
 *
 * 用途:
 * - 在 Next.js Server Component 中直接读取 WebDAV 上 `pages/` 目录下的 HTML 文件
 * - 提供路径校验、扩展名过滤、标题提取等纯函数
 *
 * 设计要点:
 * - 本模块以 `'server-only'` 标记,严禁被打包到客户端
 * - 所有路径均以 `pages/` 为前缀,避免污染 WebDAV 根目录
 * - 拉取失败(网络/权限/不存在)统一返回 `null`,由上层路由决定 404
 */
import 'server-only';
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav';
import { isValidPath, joinPath } from '@/lib/storage/path';

const PAGES_PREFIX = 'pages';

/**
 * 拼接并校验 WebDAV 上的页面相对路径
 *
 * - 自动添加 `pages/` 前缀
 * - 通过 `isValidPath` 拒绝目录穿越、绝对路径、控制字符
 * - 仅接受 `.html` / `.htm` 扩展名(大小写不敏感)
 *
 * @param segments 来自 `params.path` 的路径段数组
 * @returns 合法则返回完整相对路径;非法返回 `null`
 */
export function buildPageRelativePath(segments: readonly string[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }
  // 任一段为空字符串视为非法(例如 `/page//foo`)
  if (segments.some((seg) => typeof seg !== 'string' || seg.length === 0)) {
    return null;
  }
  const joined = joinPath(PAGES_PREFIX, ...segments);
  if (!isValidPath(joined)) {
    return null;
  }
  if (!isHtmlPath(joined)) {
    return null;
  }
  return joined;
}

/**
 * 仅接受 `.html` / `.htm` 扩展名
 */
export function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path);
}

/**
 * 提取 `<title>` 标签内容
 *
 * - 不区分大小写
 * - 去除首尾空白
 * - 未找到或内容为空均返回 `null`
 */
export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const trimmed = match?.[1]?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

/**
 * 拉取 WebDAV 上的 HTML 文件内容
 *
 * - 未配置 WebDAV:返回 `null`
 * - 拉取失败(404/网络/权限):返回 `null`,错误以 `console.error` 记录
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的相对路径
 */
export async function fetchPageHtml(relativePath: string): Promise<string | null> {
  if (!isWebDavConfigured()) {
    return null;
  }
  try {
    const client = getWebDavClient();
    const raw = await client.getFileContents(relativePath);
    if (raw === null || raw === undefined) return null;
    return normalizeWebDavContent(raw);
  } catch (err) {
    console.error('[custom-page] fetch failed:', relativePath, err);
    return null;
  }
}

/**
 * 将 webdav `getFileContents` 的多种返回类型统一转成 UTF-8 字符串
 */
function normalizeWebDavContent(
  raw: string | Buffer | ArrayBuffer | { data: string | Buffer | ArrayBuffer },
): string {
  if (typeof raw === 'string') return raw;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) {
    return raw.toString('utf8');
  }
  if (raw instanceof ArrayBuffer) {
    return new TextDecoder('utf-8').decode(new Uint8Array(raw));
  }
  // ResponseDataDetailed 形态
  if ('data' in raw) {
    const inner = raw.data;
    if (typeof inner === 'string') return inner;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(inner)) {
      return inner.toString('utf8');
    }
    if (inner instanceof ArrayBuffer) {
      return new TextDecoder('utf-8').decode(new Uint8Array(inner));
    }
  }
  return '';
}
