/**
 * 删除存储池中的文件夹(默认软删除,可通过 ?soft=false 触发物理删除)
 * DELETE /api/storage/rmdir/[...path]?soft=true|false
 *
 * - 默认软删除(?soft=true 或缺省):仅标记 Prisma `StorageFolder.deletedAt`,
 *   WebDAV 文件夹不立即删除;记录不存在(P2025)静默忽略
 * - 物理删除(?soft=false):先写审计日志(留痕),再 WebDAV 真正 delete + 清理
 *   Prisma 元数据(记录不存在不报错)
 * - 两种模式都会写审计日志,元数据区分 soft / recursive
 *
 * TODO: 物理清理(真正的 WebDAV delete)由后台 cron 任务执行,预计 7 天后。
 * TODO: 软删除暂不递归标记子文件夹,只标记目标文件夹本身(后续可扩展)。
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { logStorageAction } from '@/lib/storage/audit'
import {
  buildWebDavTarget,
  catchAllHandler,
  databaseNotConfigured,
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
  async (req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const prisma = getDb().prisma
    if (!prisma) return databaseNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (rel === '') return rootNotAllowedResponse()
    if (!isValidStoragePath(rel)) return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    // 解析 ?soft=true|false,缺省 true(软删除)
    const softParam = req.nextUrl.searchParams.get('soft')
    const softDelete = softParam === null || softParam === 'true' || softParam === '1'

    const session = await getSession()
    const actorUid = session?.uid ?? null

    if (softDelete) {
      // 软删除:仅标记 Prisma `StorageFolder.deletedAt`,不动 WebDAV
      // 记录不存在(P2025)静默忽略
      try {
        await prisma.storageFolder.update({
          where: { path: rel },
          data: { deletedAt: new Date() },
        })
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (code !== 'P2025') throw err
      }
      await logStorageAction({
        actorUid,
        action: 'rmdir',
        path: rel,
        metadata: { soft: true, recursive: false },
      })
      return new NextResponse(null, { status: 204 })
    }

    // 物理删除:先写审计日志(失败也能留痕),再 WebDAV delete + Prisma 清理
    await logStorageAction({
      actorUid,
      action: 'rmdir',
      path: rel,
      metadata: { soft: false, recursive: false },
    })

    try {
      const client = getWebDavClient()
      await client.deleteFile(target)
    } catch (err) {
      return webdavErrorResponse(err, '删除目录')
    }

    await deleteFolderMeta(rel)

    return new NextResponse(null, { status: 204 })
  }
)
