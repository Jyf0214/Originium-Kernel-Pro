/**
 * 在 WebDAV 创建文件夹,并在 KV 写入对应元数据(默认私有)
 * POST /api/storage/mkdir/[...path]
 * 已有元数据时保留原 public/description/createdAt,只更新 updatedAt
 */
import { NextResponse } from 'next/server'
import {
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getWebDavClient,
  invalidPathResponse,
  isValidStoragePath,
  isWebDavConfigured,
  readFolderMeta,
  resolveStoragePath,
  rootNotAllowedResponse,
  webdavErrorResponse,
  webdavNotConfigured,
  writeFolderMeta,
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.mkdir', requireAdmin: true },
  async (_req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    // 先在 WebDAV 上真实创建,失败直接返回
    try {
      const client = getWebDavClient()
      await client.createDirectory(target, { recursive: true })
    } catch (err) {
      return webdavErrorResponse(err, '创建目录')
    }

    // 再 upsert KV 元数据(保留已有公开/描述)
    const existing = await readFolderMeta(rel)
    const now = new Date()
    const meta = existing
      ? { ...existing, updatedAt: now }
      : {
          path: rel,
          public: false,
          description: null as string | null,
          createdAt: now,
          updatedAt: now,
        }
    await writeFolderMeta(meta)

    return NextResponse.json(meta)
  }
)
