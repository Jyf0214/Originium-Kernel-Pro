/**
 * 单个文件夹元数据
 * GET    /api/storage/folder/[...path]  → 读取一条记录
 * PATCH  /api/storage/folder/[...path]  → 部分更新 public / description
 */
import { NextResponse } from 'next/server'
import { ApiErr } from '@/lib/api-handler'
import { createApiLogger } from '@/lib/api-logger'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/hash'
import { logAudit } from '@/lib/audit'
import { getTranslate } from '@/i18n/translate'
import {
  catchAllHandler,
  databaseNotConfigured,
  getPathParts,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  readFolderMeta,
  resolveStoragePath,
  storageNotConfigured,
  writeFolderMeta,
  requireApiKeyPerm,
} from '../../_helpers'

const logger = createApiLogger('/api/storage/folder')

/** 读取单条文件夹元数据 */
export const GET = catchAllHandler<{ path: string[] }>(
  'GET',
  { label: 'storage.folder.get', requireRoot: true },
  async (_req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()
    if (!getDb().prisma) return databaseNotConfigured()

    const denied = await requireApiKeyPerm('storage_read')
    if (denied) return denied

    const parts = await getPathParts(context)
    const path = resolveStoragePath(parts)
    if (!isValidStoragePath(path)) return invalidPathResponse()

    const cacheHeaders = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }

    const meta = await readFolderMeta(path)
    if (meta) return NextResponse.json(meta, { headers: cacheHeaders })

    // 元数据不存在时自动创建默认记录(public=false,新建文件夹默认私有)
    const now = new Date()
    await writeFolderMeta({ path, public: false, description: null, createdAt: now, updatedAt: now })
    const created = await readFolderMeta(path)
    return NextResponse.json(created ?? { path, public: false, description: null, createdAt: now, updatedAt: now }, { headers: cacheHeaders })
  }
)

/** 校验 PATCH 请求体字段类型 */
function validatePatchFields(parsed: Record<string, unknown>): { error?: NextResponse } {
  const rawPublic = parsed['public']
  const rawDescription = parsed['description']
  const rawPassword = parsed['password']

  if (rawPublic !== undefined && typeof rawPublic !== 'boolean') {
    return { error: ApiErr.badRequest(getTranslate('api.storage.publicMustBeBoolean')) }
  }
  if (
    rawDescription !== undefined &&
    rawDescription !== null &&
    typeof rawDescription !== 'string'
  ) {
    return { error: ApiErr.badRequest(getTranslate('api.storage.descriptionMustBeString')) }
  }
  if (
    rawPassword !== undefined &&
    rawPassword !== null &&
    typeof rawPassword !== 'string'
  ) {
    return { error: ApiErr.badRequest(getTranslate('api.storage.passwordMustBeString')) }
  }
  if (typeof rawPassword === 'string' && rawPassword.length > 128) {
    return { error: ApiErr.badRequest(getTranslate('api.storage.passwordTooLong')) }
  }
  return {}
}

/** 根据请求体和已有元数据计算合并后的字段值 */
async function mergePatchFields(
  parsed: Record<string, unknown>,
  existing: { public: boolean; description: string | null },
): Promise<{ nextPublic: boolean; nextDescription: string | null; nextPassword: string | null; passwordChanged: boolean }> {
  const rawPassword = parsed['password']
  const nextPublic = (parsed['public'] as boolean | undefined) ?? existing.public
  const nextDescription = (parsed['description'] as string | null | undefined) ?? existing.description

  let nextPassword: string | null = null
  let passwordChanged = false
  if (rawPassword !== undefined) {
    passwordChanged = true
    if (rawPassword === null || rawPassword === '') {
      nextPassword = null
    } else {
      nextPassword = await hashPassword(rawPassword as string)
    }
  }

  return { nextPublic, nextDescription, nextPassword, passwordChanged }
}

/** 部分更新文件夹元数据(public / description) */
export const PATCH = catchAllHandler<{ path: string[] }>(
  'PATCH',
  { label: 'storage.folder.patch', requireRoot: true },
  async (req, context, session) => {
    const auditUser = session?.uid ?? 'unknown'
    if (!isStorageConfigured()) return storageNotConfigured()
    const prisma = getDb().prisma
    if (!prisma) return databaseNotConfigured()

    const denied = await requireApiKeyPerm('settings_write')
    if (denied) return denied

    const parts = await getPathParts(context)
    const path = resolveStoragePath(parts)
    if (!isValidStoragePath(path)) {
      void logAudit('storage_folder_update_failed', 'storage', `更新文件夹元数据失败：路径非法（${path}）`, auditUser)
      return invalidPathResponse()
    }

    const existing = await readFolderMeta(path)
    if (!existing) {
      void logAudit('storage_folder_update_failed', 'storage', `更新文件夹元数据失败：文件夹不存在（${path}）`, auditUser)
      return ApiErr.notFound(getTranslate('api.storage.folderMetaNotFound'))
    }

    let parsed: Record<string, unknown>
    try {
      parsed = (await req.json()) as Record<string, unknown>
    } catch {
      void logAudit('storage_folder_update_failed', 'storage', `更新文件夹元数据失败：请求体格式错误（${path}）`, auditUser)
      return ApiErr.badRequest(getTranslate('api.storage.invalidJson'))
    }

    const validation = validatePatchFields(parsed)
    if (validation.error) {
      void logAudit('storage_folder_update_failed', 'storage', `更新文件夹元数据失败：字段校验未通过（${path}）`, auditUser)
      return validation.error
    }

    const { nextPublic, nextDescription, nextPassword, passwordChanged } =
      await mergePatchFields(parsed, existing)

    const updatedAt = new Date()
    const updated = await prisma.storageFolder.update({
      where: { path },
      data: {
        public: nextPublic,
        description: nextDescription,
        ...(passwordChanged ? { password: nextPassword } : {}),
        updatedAt,
      },
    })

    logger.info('PATCH', `path="${path}" public=${nextPublic} password=${passwordChanged ? '已更新' : '未变'}`)
    void logAudit('storage_folder_update', 'storage', `更新文件夹元数据：${path}`, auditUser)
    return NextResponse.json({
      path: updated.path,
      public: updated.public,
      description: updated.description,
      hasPassword: !!updated.password,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  }
)
