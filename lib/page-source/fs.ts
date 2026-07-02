/**
 * 自定义 HTML 页面 — 本地 fs 读取层
 *
 * 用途:
 * - 运行时 (Runtime) 页面渲染唯一数据源
 * - 直接从构建时同步好的 `./pages/` 目录读取文件
 *
 * 设计原则:
 * - 极致性能: 使用原生 fs.readFileSync (同步读取，因为在 Next.js Server Component 中)
 * - 零网络依赖: 运行时完全不调用 B2/WebDAV API
 * - 接口对齐: 与 `lib/page-source/webdav.ts` 保持一致的 `fetchPageHtml` 签名
 */
import fs from 'fs';
import path from 'path';
import { normalizeWebDavContent } from './shared';

/**
 * 从本地文件系统读取 HTML 内容
 *
 * @param relativePath 已通过 `buildPageRelativePath` 校验的相对路径(含 `pages/` 前缀)
 * @returns 文件内容字符串或 null (不存在/读取失败)
 */
export function fetchPageHtml(relativePath: string): string | null {
  try {
    // 1. 构造本地绝对路径
    // relativePath 已经是 'pages/xxx.html' 格式
    const absolutePath = path.join(process.cwd(), relativePath);

    // 2. 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    // 3. 读取内容
    const raw = fs.readFileSync(absolutePath, 'utf-8');
    
    // 4. 统一归一化处理 (保持与 webdav.ts 一致)
    const text = normalizeWebDavContent(raw);
    return text.length > 0 ? text : null;
  } catch (err) {
    console.error(`[page-source-fs] fetchPageHtml failed for "${relativePath}"`, err);
    return null;
  }
}

/**
 * 本地文件系统版本 de scanPagesHtmlDeep
 * 仅用于本地调试或构建后验证，运行时不再需要调用
 */
export function scanLocalPagesHtml(): { relativePath: string }[] {
  const pagesDir = path.join(process.cwd(), 'pages');
  if (!fs.existsSync(pagesDir)) return [];

  const out: { relativePath: string }[] = [];
  
  const readDir = (dir: string, depth: number) => {
    if (depth > 2) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(process.cwd(), fullPath);
      if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        out.push({ relativePath: relPath });
      } else if (entry.isDirectory()) {
        readDir(fullPath, depth + 1);
      }
    }
  };

  readDir(pagesDir, 1);
  return out;
}
