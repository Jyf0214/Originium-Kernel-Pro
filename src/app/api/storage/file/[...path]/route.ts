/**
 * 删除存储池中的文件
 * DELETE /api/storage/file/[...path]
 * 路径必须指向一个具体文件,不能是根
 */
import { NextResponse } from 'next/server'
import { createApiLogger } from '@/lib/api-logger'
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
  { label: 'storage.file.delete', requireAdmin: true },
  async (_req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const denied = await requireApiKeyPerm('storage_delete')
    if (denied) return denied

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    try {
      const provider = await getStorageProvider()
      await provider.deleteFile(target)
    } catch (err) {
      logger.error('DELETE', `target="${target}" 失败`, { error: (err as Error).message })
      return storageErrorResponse(err, '删除文件')
    }

    logger.info('DELETE', `target="${target}" 已删除`)
    return new NextResponse(null, { status: 204 })
  }
)
