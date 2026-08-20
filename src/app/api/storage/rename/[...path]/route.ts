/**
 * 重命名存储池中的文件夹
 * POST /api/storage/rename/[...path]
 *
 * 请求体: { newName: string }
 * 重命名存储后端文件/文件夹 + 更新数据库元数据
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
  readFolderMeta,
  renameFolderMeta,
  resolveStoragePath,
  rootNotAllowedResponse,
  storageErrorResponse,
  storageNotConfigured,
  requireApiKeyPerm,
} from '../../_helpers'

const logger = createApiLogger('/api/storage/rename')

/** 检查目标路径是否已存在（数据库 + 存储层双重检查） */
async function assertTargetAvailable(newRel: string, segments: string[], newName: string): Promise<NextResponse | null> {
  try {
    const existingMeta = await readFolderMeta(newRel)
    if (existingMeta) {
      return NextResponse.json({ error: getTranslate('api.storage.targetNameExists') }, { status: 409 })
    }
  } catch {
    // 忽略 DB 检查失败，继续检查存储层
  }
  try {
    const provider = await getStorageProvider()
    const newTarget = buildWebDavTarget([...segments, newName])
    await provider.stat(newTarget)
    return NextResponse.json({ error: getTranslate('api.storage.targetNameExists') }, { status: 409 })
  } catch {
    // stat 失败说明目标不存在，可以继续
  }
  return null
}

/** 校验重命名名称合法性:空值、特殊字符、目录穿越 */
function validateNewName(newName: string): NextResponse | null {
  if (!newName) {
    return NextResponse.json({ error: getTranslate('api.storage.newNameEmpty') }, { status: 400 })
  }
  if (newName.includes('/') || newName.includes('\\') || newName === '.' || newName === '..') {
    return NextResponse.json({ error: getTranslate('api.storage.invalidName') }, { status: 400 })
  }
  return null
}

/** 解析重命名请求：校验名称、计算新路径 */
function parseRenameInput(
  reqBody: Record<string, unknown>,
  rel: string,
): { newName: string; newRel: string; segments: string[] } | NextResponse {
  const newName = String(reqBody.newName ?? '').trim()
  const nameError = validateNewName(newName)
  if (nameError) return nameError

  // 提取父路径和旧文件夹名
  const segments = rel.split('/')
  const oldName = segments.pop()!
  const parentPath = segments.join('/')

  if (newName === oldName) {
    return NextResponse.json({ error: getTranslate('api.storage.sameName') }, { status: 400 })
  }

  const newRel = parentPath ? `${parentPath}/${newName}` : newName
  if (!isValidStoragePath(newRel)) return invalidPathResponse()

  return { newName, newRel, segments }
}

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.rename', requireRoot: true },
  async (req, context, session) => {
    const auditUser = session?.uid ?? 'unknown'
    if (!isStorageConfigured()) return storageNotConfigured()

    const denied = await requireApiKeyPerm('storage_write')
    if (denied) return denied

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') {
      void logAudit('storage_rename_failed', 'storage', '重命名失败：不能操作根目录', auditUser)
      return rootNotAllowedResponse()
    }
    if (!isValidStoragePath(rel)) {
      void logAudit('storage_rename_failed', 'storage', `重命名失败：路径非法（${rel}）`, auditUser)
      return invalidPathResponse()
    }

    // 解析请求体
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      void logAudit('storage_rename_failed', 'storage', `重命名失败：请求体格式错误（${rel}）`, auditUser)
      return NextResponse.json({ error: getTranslate('api.common.invalidBody') }, { status: 400 })
    }

    const parseResult = parseRenameInput(body, rel)
    if (parseResult instanceof NextResponse) {
      void logAudit('storage_rename_failed', 'storage', `重命名失败：名称校验未通过（${rel}）`, auditUser)
      return parseResult
    }
    const { newName, newRel, segments } = parseResult

    // 检查目标是否已存在（数据库 + 存储层双重检查）
    const conflict = await assertTargetAvailable(newRel, segments, newName)
    if (conflict) {
      void logAudit('storage_rename_failed', 'storage', `重命名失败：目标已存在（${newRel}）`, auditUser)
      return conflict
    }

    const oldTarget = buildWebDavTarget(parts)
    // 构建新目标路径:替换最后一段
    const newParts = [...segments, newName]
    const newTarget = buildWebDavTarget(newParts)

    try {
      const provider = await getStorageProvider()
      await provider.moveFile(oldTarget, newTarget)
    } catch (err) {
      logger.error('POST', `target="${oldTarget}" → "${newTarget}" 失败`, { error: (err as Error).message })
      void logAudit('storage_rename_failed', 'storage', `重命名失败：${rel} → ${newRel}`, auditUser)
      return storageErrorResponse(err, getTranslate('api.storage.opRename'))
    }

    // 更新数据库元数据
    try {
      await renameFolderMeta(rel, newRel)
    } catch (metaErr) {
      logger.error('POST', `元数据更新失败 "${rel}" → "${newRel}"`, { error: (metaErr as Error).message })
    }

    logger.info('POST', `"${rel}" → "${newRel}" 重命名成功`)
    void logAudit('storage_rename', 'storage', `重命名：${rel} → ${newRel}`, auditUser)

    // 返回更新后的元数据
    const meta = await readFolderMeta(newRel)
    return NextResponse.json(meta ?? {
      path: newRel,
      public: false,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
)
