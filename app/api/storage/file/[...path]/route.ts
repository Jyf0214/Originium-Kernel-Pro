/**
 * 删除存储池中的文件
 * DELETE /api/storage/file/[...path]
 * 路径必须指向一个具体文件,不能是根
 */
import { NextResponse } from 'next/server'
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
} from '../../_helpers'

export const DELETE = catchAllHandler<{ path: string[] }>(
  'DELETE',
  { label: 'storage.file.delete', requireAdmin: true },
  async (_req, context) => {
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
      console.error(`[storage.file.delete] target="${target}" 失败`, err)
      return storageErrorResponse(err, '删除文件')
    }

    console.warn(`[storage.file.delete] target="${target}" 已删除`)
    return new NextResponse(null, { status: 204 })
  }
)
