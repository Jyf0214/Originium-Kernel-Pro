/**
 * 单个文件夹元数据
 * GET    /api/storage/folder/[...path]  → 读取一条记录
 * PATCH  /api/storage/folder/[...path]  → 部分更新 public / description
 */
import { NextResponse } from 'next/server'
import { ApiErr } from '@/lib/api-handler'
import { getDb } from '@/lib/db'
import {
  catchAllHandler,
  databaseNotConfigured,
  getPathParts,
  invalidPathResponse,
  isValidStoragePath,
  readFolderMeta,
  resolveStoragePath,
  webdavNotConfigured,
} from '../../_helpers'
import { isWebDavConfigured } from '@/lib/webdav'

/** 读取单条文件夹元数据 */
export const GET = catchAllHandler<{ path: string[] }>(
  'GET',
  { label: 'storage.folder.get', requireAdmin: true },
  async (_req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()
    if (!getDb().prisma) return databaseNotConfigured()

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
    if (!isWebDavConfigured()) return webdavNotConfigured()
    const prisma = getDb().prisma
    if (!prisma) return databaseNotConfigured()

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

    const nextPublic = rawPublic ?? existing.public
    const nextDescription = rawDescription ?? existing.description
    const updatedAt = new Date()

    // Prisma 直接 update,保留 createdAt,刷新 updatedAt
    const updated = await prisma.storageFolder.update({
      where: { path },
      data: {
        public: nextPublic,
        description: nextDescription,
        updatedAt,
      },
    })

    return NextResponse.json({
      path: updated.path,
      public: updated.public,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  }
)
