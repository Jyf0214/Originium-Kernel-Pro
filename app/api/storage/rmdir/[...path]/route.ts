/**
 * 删除存储池中的空文件夹(WebDAV 不允许删除非空目录)
 * DELETE /api/storage/rmdir/[...path]
 * 先删 WebDAV 目录,再删 Prisma `storageFolder` 元数据;Prisma 记录不存在不算错
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  buildWebDavTarget,
  catchAllHandler,
  databaseNotConfigured,
  deleteFolderMeta,
  getPathParts,
  getWebDavClient,
  invalidPathResponse,
  isValidStoragePath,
  isWebDavConfigured,
  resolveStoragePath,
  rootNotAllowedResponse,
  webdavErrorResponse,
  webdavNotConfigured,
} from '../../_helpers'

export const DELETE = catchAllHandler<{ path: string[] }>(
  'DELETE',
  { label: 'storage.rmdir', requireAdmin: true },
  async (_req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()
    if (!getDb().prisma) return databaseNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    // 先在 WebDAV 上真实删除,失败直接返回
    try {
      const client = getWebDavClient()
      await client.deleteFile(target)
    } catch (err) {
      return webdavErrorResponse(err, '删除目录')
    }

    // 再清理 Prisma 元数据(记录不存在/P2025 静默忽略)
    await deleteFolderMeta(rel)

    return new NextResponse(null, { status: 204 })
  }
)
