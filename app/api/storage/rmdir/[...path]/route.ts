/**
 * 删除存储池中的空文件夹(WebDAV 不允许删除非空目录)
 * DELETE /api/storage/rmdir/[...path]
 * 先删 KV 元数据,再删 WebDAV 目录;任一失败返回错误
 */
import { NextResponse } from 'next/server'
import {
  buildWebDavTarget,
  catchAllHandler,
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

    // 再清理 KV 元数据
    await deleteFolderMeta(rel)

    return new NextResponse(null, { status: 204 })
  }
)
