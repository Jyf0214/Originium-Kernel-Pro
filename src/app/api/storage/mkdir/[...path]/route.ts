/**
 * 在 WebDAV 创建文件夹,并在 Prisma `storageFolder` 表写入/更新对应元数据(默认私有)
 * POST /api/storage/mkdir/[...path]
 * 已有元数据时保留原 public/description/createdAt,只刷新 updatedAt
 */
import { NextResponse } from 'next/server'
import { createApiLogger } from '@/lib/api-logger'
import { getDb } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { getTranslate } from '@/i18n/translate'

const logger = createApiLogger('storage.mkdir')
import {
  buildWebDavTarget,
  catchAllHandler,
  databaseNotConfigured,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  readFolderMeta,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
  requireApiKeyPerm,
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.mkdir', requireRoot: true },
  async (_req, context, session) => {
    const auditUser = session?.uid ?? 'unknown'
    if (!isStorageConfigured()) return storageNotConfigured()

    const denied = await requireApiKeyPerm('storage_write')
    if (denied) return denied

    const prisma = getDb().prisma
    if (!prisma) return databaseNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') {
      void logAudit('storage_mkdir_failed', 'storage', '创建文件夹失败：不能操作根目录', auditUser)
      return rootNotAllowedResponse()
    }
    if (!isValidStoragePath(rel)) {
      void logAudit('storage_mkdir_failed', 'storage', `创建文件夹失败：路径非法（${rel}）`, auditUser)
      return invalidPathResponse()
    }
    const target = buildWebDavTarget(parts)

    // 先在存储后端上真实创建,失败直接返回
    try {
      const provider = await getStorageProvider()
      await provider.createDirectory(target, { recursive: true })
    } catch (err) {
      logger.error('POST', `target="${target}" 存储后端创建失败`, { error: (err as Error).message })
      void logAudit('storage_mkdir_failed', 'storage', `创建文件夹失败：${target}`, auditUser)
      return storageErrorResponse(err, getTranslate('api.storage.opCreateDirectory'))
    }

    // 再 upsert Prisma 元数据(保留已有公开/描述,仅刷新 updatedAt)
    const existing = await readFolderMeta(rel)
    const now = new Date()
    const upserted = await prisma.storageFolder.upsert({
      where: { path: rel },
      create: {
        path: rel,
        public: false,
        description: null,
      },
      update: {
        // 保留 public / description;仅刷新 updatedAt
        updatedAt: now,
      },
    })

    const meta = existing
      ? { ...existing, updatedAt: upserted.updatedAt }
      : {
          path: upserted.path,
          public: upserted.public,
          description: upserted.description,
          createdAt: upserted.createdAt,
          updatedAt: upserted.updatedAt,
        }

    logger.info('POST', `target="${target}" 元数据已写入`)
    void logAudit('storage_mkdir', 'storage', `创建文件夹：${target}`, auditUser)
    return NextResponse.json(meta)
  }
)
