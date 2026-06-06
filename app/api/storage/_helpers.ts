/**
 * 存储池管理 API 共享工具
 *
 * 仅供 app/api/storage/** 下的路由使用,集中处理:
 * - 文件夹元数据(KV,前缀 storage-folder-meta:)的增删查
 * - WebDAV 未配置 / 路径非法 / 资源不存在 / 上游错误的统一响应
 * - [...path] 路由参数到 WebDAV 目标路径的解析
 * - WebDavEntry 类型转换
 *
 * 与 lib/storage/acl.ts 保持同构:acl.ts 只读 KV(用于公开访问的 ACL 判定),
 * 本文件在管理员操作时同时读写 KV。
 */
import { NextResponse, type NextRequest } from 'next/server'
import type { FileStat } from 'webdav'
import { getDb } from '@/lib/db'
import { isWebDavConfigured, getWebDavClient } from '@/lib/webdav'
import { isValidPath, joinPath } from '@/lib/storage/path'
import { apiHandler } from '@/lib/api-handler'
import type { StorageFolderMeta, WebDavEntry } from '@/lib/storage/types'

/** 与 lib/api-handler 内部 ApiHandlerOptions 同构(该类型未导出,本地复刻) */
interface HandlerOptions {
  label: string
  requireAuth?: boolean
  requireAdmin?: boolean
}

/** WebDAV 服务器根路径:暂未支持多挂载,所有路径相对服务器根(空串) */
const STORAGE_ROOT = ''

/** KV 中文件夹元数据 key 的前缀(与 lib/storage/acl.ts 一致) */
const FOLDER_META_PREFIX = 'storage-folder-meta:'

/** 上传文件大小上限:50MB */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024

/**
 * 解析 [...path] 路由参数为相对路径字符串
 * - 空数组 / undefined → ''
 * - 单段 → 'covers'
 * - 多段 → 'covers/2024/img.png'
 */
export function resolveStoragePath(parts: string[] | undefined): string {
  if (!parts || parts.length === 0) return ''
  return joinPath(...parts)
}

/** 校验 [...path] 解析后的路径是否合法(空路径视为合法,代表根) */
export function isValidStoragePath(path: string): boolean {
  if (path === '') return true
  return isValidPath(path)
}

/** 把 [...path] 与 STORAGE_ROOT 拼接,得到 WebDAV 目标路径 */
export function buildWebDavTarget(parts: string[] | undefined): string {
  return joinPath(STORAGE_ROOT, resolveStoragePath(parts))
}

/** WebDAV 未配置时返回的 503 响应(供前端识别) */
export function webdavNotConfigured(): NextResponse {
  return NextResponse.json(
    { error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' },
    { status: 503 }
  )
}

/** 路径非法时返回的 400 响应 */
export function invalidPathResponse(): NextResponse {
  return NextResponse.json({ error: '路径非法' }, { status: 400 })
}

/** 不能对根目录执行该操作时返回的 400 响应 */
export function rootNotAllowedResponse(): NextResponse {
  return NextResponse.json({ error: '不能操作根目录' }, { status: 400 })
}

/** 上传文件过大时返回的 413 响应 */
export function payloadTooLargeResponse(size: number): NextResponse {
  return NextResponse.json(
    { error: `文件过大(${size} bytes,上限 ${MAX_UPLOAD_SIZE} bytes)` },
    { status: 413 }
  )
}

/** 从 [...path] 路由参数安全获取 string[] 类型(避免 apiHandler 上下文类型过宽) */
export async function getPathParts(
  context: { params: Promise<Record<string, unknown>> } | undefined
): Promise<string[]> {
  const params = (await context?.params) ?? {}
  const raw = params['path']
  return Array.isArray(raw) ? (raw as string[]) : []
}

/** 读取单个文件夹元数据;不存在或损坏 → null */
export async function readFolderMeta(path: string): Promise<StorageFolderMeta | null> {
  const raw = await getDb().get(`${FOLDER_META_PREFIX}${path}`)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as {
      path: string
      public: boolean
      description: string | null
      createdAt: string
      updatedAt: string
    }
    return {
      path: p.path,
      public: p.public,
      description: p.description,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }
  } catch {
    return null
  }
}

/** 写入文件夹元数据(JSON 序列化到 KV) */
export async function writeFolderMeta(meta: StorageFolderMeta): Promise<void> {
  await getDb().set(
    `${FOLDER_META_PREFIX}${meta.path}`,
    JSON.stringify({
      path: meta.path,
      public: meta.public,
      description: meta.description,
      createdAt: meta.createdAt.toISOString(),
      updatedAt: meta.updatedAt.toISOString(),
    })
  )
}

/** 删除文件夹元数据 */
export async function deleteFolderMeta(path: string): Promise<void> {
  await getDb().del(`${FOLDER_META_PREFIX}${path}`)
}

/** 列出所有文件夹元数据(损坏数据自动跳过) */
export async function listAllFolderMetas(): Promise<StorageFolderMeta[]> {
  const all = await getDb().hgetall(FOLDER_META_PREFIX)
  const result: StorageFolderMeta[] = []
  for (const raw of Object.values(all)) {
    try {
      const p = JSON.parse(raw) as {
        path: string
        public: boolean
        description: string | null
        createdAt: string
        updatedAt: string
      }
      result.push({
        path: p.path,
        public: p.public,
        description: p.description,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })
    } catch {
      // 跳过损坏数据
    }
  }
  return result
}

/** 转换 webdav FileStat → WebDavEntry(mime 缺失时为 null) */
export function toWebDavEntry(stat: FileStat): WebDavEntry {
  return {
    filename: stat.filename,
    basename: stat.basename,
    isDirectory: stat.type === 'directory',
    size: stat.size,
    lastModified: stat.lastmod,
    mimeType: stat.mime ?? null,
  }
}

/**
 * 把任意错误转换为 NextResponse
 * - WebDAV 404 → 404
 * - WebDAV 5xx → 502(上游故障)
 * - 其他 → 500(本地错误)
 */
export function webdavErrorResponse(err: unknown, op: string): NextResponse {
  const e = err as { status?: number; message?: string }
  if (e?.status === 404) {
    return NextResponse.json({ error: '资源不存在' }, { status: 404 })
  }
  if (e?.status && e.status >= 500) {
    return NextResponse.json(
      { error: `${op} 失败`, details: e.message ?? 'WebDAV 上游错误' },
      { status: 502 }
    )
  }
  return NextResponse.json(
    { error: `${op} 失败`, details: e?.message ?? String(err) },
    { status: 500 }
  )
}

/** 重新导出供各路由直接使用 */
export { isWebDavConfigured, getWebDavClient }

/**
 * 给 catch-all 路由使用的类型化包装
 *
 * 背景:apiHandler 内部 context 类型是 { params: Promise<Record<string, string>> },
 * 但 Next.js 16 RouteHandlerConfig 对 [...path] 路由要求 context.params 是
 * { path: string[] }。这里用一次显式类型转换,既保留 apiHandler 的统一鉴权/日志,
 * 又满足路由配置的类型校验。运行时行为完全一致(都是 await context?.params)。
 */
export function catchAllHandler<TParams extends object>(
  method: string,
  options: HandlerOptions,
  handler: (
    req: NextRequest,
    context: { params: Promise<TParams> } | undefined
  ) => Promise<NextResponse>
): (req: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse> {
  // 强转 handler:业务函数签名用了 TParams,而 apiHandler 内部期望 Record<string,string>
  // 运行时行为完全一致(await context?.params 在两种类型下都安全)
  const wrapped = apiHandler(
    method,
    options,
    handler as unknown as Parameters<typeof apiHandler>[2]
  )
  return wrapped as unknown as (
    req: NextRequest,
    context: { params: Promise<TParams> }
  ) => Promise<NextResponse>
}
