/**
 * 页面元数据客户端 API 封装
 *
 * 通过 /api/page/meta/[...path] 端点读写 meta.json。
 * 仅客户端组件使用（调用 Next.js API 路由），不直接操作 WebDAV。
 */

import type { PageMeta } from '@/lib/page-source/shared';

/** 从 PageIndexItem 的 folder + filename 构造 API 路径段 */
function buildApiPath(folder: string | undefined, filename: string): string {
  const cleanFolder = folder?.replace(/^\/+|\/+$/g, '') ?? '';
  return cleanFolder ? `${cleanFolder}/${filename}` : filename;
}

/**
 * 读取指定页面的元数据
 *
 * @param folder 页面所在子目录（可为空）
 * @param filename 页面文件名（如 my-page.html）
 * @returns 元数据对象，不存在或出错时返回 null
 */
export async function readPageMeta(
  folder: string | undefined,
  filename: string,
): Promise<PageMeta | null> {
  const apiPath = buildApiPath(folder, filename);
  try {
    const res = await fetch(`/api/page/meta/${apiPath}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.meta ?? null;
  } catch {
    return null;
  }
}

/**
 * 写入/更新指定页面的元数据
 *
 * @param folder 页面所在子目录（可为空）
 * @param filename 页面文件名（如 my-page.html）
 * @param meta 要写入的元数据字段（合并写入，保留未传字段）
 * @returns 成功时返回更新后的 meta，失败时抛出 Error
 */
export async function writePageMeta(
  folder: string | undefined,
  filename: string,
  meta: PageMeta,
): Promise<PageMeta> {
  const apiPath = buildApiPath(folder, filename);
  const res = await fetch(`/api/page/meta/${apiPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? '保存元数据失败');
  }
  return data.meta as PageMeta;
}
