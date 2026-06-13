/**
 * 删除存储池中的文件夹
 * DELETE /api/storage/rmdir/[...path]
 *
 * - WebDAV 物理删除 + Prisma 元数据清理
 */
import { NextResponse } from 'next/server'
import {
  buildWebDavTarget,
  catchAllHandler,
  deleteFolderMeta,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
} from '../../_helpers'

export const DELETE = catchAllHandler<{ path: string[] }>(
  'DELETE',
  { label: 'storage.rmdir', requireAdmin: true },
  async (req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    try {
      const provider = await getStorageProvider()
      await provider.deleteFile(target)
    } catch (err) {
      console.error(`[storage.rmdir] target="${target}" 存储后端删除失败`, err)
      return storageErrorResponse(err, '删除目录')
    }

    await deleteFolderMeta(rel)
    console.warn(`[storage.rmdir] target="${target}" 已删除(元数据已清理)`)
    return new NextResponse(null, { status: 204 })
  }
)
