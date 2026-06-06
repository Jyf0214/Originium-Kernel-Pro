/**
 * 单个文件夹元数据
 * GET    /api/storage/folder/[...path]  → 读取一条记录
 * PATCH  /api/storage/folder/[...path]  → 部分更新 public / description
 */
import { NextResponse } from 'next/server'
import { ApiErr } from '@/lib/api-handler'
import {
  catchAllHandler,
  getPathParts,
  resolveStoragePath,
  isValidStoragePath,
  invalidPathResponse,
  readFolderMeta,
  writeFolderMeta,
} from '../../_helpers'

/** 读取单条文件夹元数据 */
export const GET = catchAllHandler<{ path: string[] }>(
  'GET',
  { label: 'storage.folder.get', requireAdmin: true },
  async (_req, context) => {
    const parts = await getPathParts(context)
    const path = resolveStoragePath(parts)
    if (!isValidStoragePath(path)) return invalidPathResponse()

    const meta = await readFolderMeta(path)
    if (!meta) return ApiErr.notFound('文件夹元数据不存在')
    return NextResponse.json(meta)
  }
)

/** 部分更新文件夹元数据(public / description) */
export const PATCH = catchAllHandler<{ path: string[] }>(
  'PATCH',
  { label: 'storage.folder.patch', requireAdmin: true },
  async (req, context) => {
    const parts = await getPathParts(context)
    const path = resolveStoragePath(parts)
    if (!isValidStoragePath(path)) return invalidPathResponse()

    const existing = await readFolderMeta(path)
    if (!existing) return ApiErr.notFound('文件夹元数据不存在')

    let parsed: Record<string, unknown>
    try {
      parsed = (await req.json()) as Record<string, unknown>
    } catch {
      return ApiErr.badRequest('请求体不是合法 JSON')
    }

    const rawPublic = parsed['public']
    const rawDescription = parsed['description']
    if (rawPublic !== undefined && typeof rawPublic !== 'boolean') {
      return ApiErr.badRequest('public 必须是 boolean')
    }
    if (
      rawDescription !== undefined &&
      rawDescription !== null &&
      typeof rawDescription !== 'string'
    ) {
      return ApiErr.badRequest('description 必须是 string 或 null')
    }

    const next: typeof existing = {
      path: existing.path,
      public: rawPublic ?? existing.public,
      description:
        rawDescription === undefined ? existing.description : rawDescription,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    await writeFolderMeta(next)
    return NextResponse.json(next)
  }
)
