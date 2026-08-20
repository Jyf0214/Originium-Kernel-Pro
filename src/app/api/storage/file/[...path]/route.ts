/**
 * 删除存储池中的文件
 * DELETE /api/storage/file/[...path]
 * 路径必须指向一个具体文件,不能是根
 */
import { NextResponse } from 'next/server'
import { createApiLogger } from '@/lib/api-logger'
import { logAudit } from '@/lib/audit'
import { getTranslate } from '@/i18n/translate'
import {
  buildWebDavTarget,
  catchAllHandler,
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

const logger = createApiLogger('/api/storage/file')

export const DELETE = catchAllHandler<{ path: string[] }>(
  'DELETE',
  { label: 'storage.file.delete', requireRoot: true },
  async (_req, context, session) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const denied = await requireApiKeyPerm('storage_delete')
    if (denied) return denied

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') {
      void logAudit('storage_delete_file_failed', 'storage', '删除文件失败：不能操作根目录', session?.uid ?? 'unknown')
      return rootNotAllowedResponse()
    }
    if (!isValidStoragePath(rel)) {
      void logAudit('storage_delete_file_failed', 'storage', `删除文件失败：路径非法（${rel}）`, session?.uid ?? 'unknown')
      return invalidPathResponse()
    }
    const target = buildWebDavTarget(parts)

    try {
      const provider = await getStorageProvider()
      await provider.deleteFile(target)
    } catch (err) {
      logger.error('DELETE', `target="${target}" 失败`, { error: (err as Error).message })
      void logAudit('storage_delete_file_failed', 'storage', `删除文件失败：${target}`, session?.uid ?? 'unknown')
      return storageErrorResponse(err, getTranslate('api.storage.opDeleteFile'))
    }

    logger.info('DELETE', `target="${target}" 已删除`)
    void logAudit('storage_delete_file', 'storage', `删除文件：${target}`, session?.uid ?? 'unknown')
    return new NextResponse(null, { status: 204 })
  }
)
