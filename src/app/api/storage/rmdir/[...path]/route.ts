/**
 * 删除存储池中的文件夹
 * DELETE /api/storage/rmdir/[...path]
 *
 * - WebDAV 物理删除 + Prisma 元数据清理
 */
import { NextResponse } from 'next/server'
import { createApiLogger } from '@/lib/api-logger'
import { logAudit } from '@/lib/audit'
import { getTranslate } from '@/i18n/translate'
import {
  buildWebDavTarget,
  catchAllHandler,
  deleteFolderMetaCascade,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
  requireApiKeyPerm,
} from '../../_helpers'

const logger = createApiLogger('/api/storage/rmdir')

export const DELETE = catchAllHandler<{ path: string[] }>(
  'DELETE',
  { label: 'storage.rmdir', requireRoot: true },
  async (req, context, session) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const denied = await requireApiKeyPerm('storage_delete')
    if (denied) return denied

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') {
      void logAudit('storage_rmdir_failed', 'storage', '删除文件夹失败：不能操作根目录', session?.uid ?? 'unknown')
      return rootNotAllowedResponse()
    }
    if (!isValidStoragePath(rel)) {
      void logAudit('storage_rmdir_failed', 'storage', `删除文件夹失败：路径非法（${rel}）`, session?.uid ?? 'unknown')
      return invalidPathResponse()
    }
    const target = buildWebDavTarget(parts)

    try {
      const provider = await getStorageProvider()
      // WebDAV deleteFile 可删除目录，但 B2 需要用 deleteDirectory
      // 移除 .keep 占位文件。通过 StorageProvider 接口统一处理。
      await provider.deleteDirectory(target)
    } catch (err) {
      logger.error('DELETE', `target="${target}" 存储后端删除失败`, { error: (err as Error).message })
      void logAudit('storage_rmdir_failed', 'storage', `删除文件夹失败：${target}`, session?.uid ?? 'unknown')
      return storageErrorResponse(err, getTranslate('api.storage.opDeleteDirectory'))
    }

    await deleteFolderMetaCascade(rel)
    logger.info('DELETE', `target="${target}" 已删除(元数据已清理)`)
    void logAudit('storage_rmdir', 'storage', `删除文件夹：${target}`, session?.uid ?? 'unknown')
    return new NextResponse(null, { status: 204 })
  }
)
