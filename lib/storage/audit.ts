/**
 * 存储池操作审计日志
 *
 * 任何对 WebDAV 存储池/Prisma storage_folders 表的写操作(rmdir / mkdir /
 * upload / delete_file / set_public / set_password)都应通过本模块记录审计日志。
 *
 * 设计要点:
 * - 失败容错:审计日志写入失败不应阻塞主操作,只 console.warn 留痕
 * - 软删除 + 物理删除共用同一 action 'rmdir',通过 metadata.soft 区分
 * - 系统操作(无登录态)actorUid = null
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type StorageAction =
  | 'rmdir'
  | 'mkdir'
  | 'upload'
  | 'delete_file'
  | 'set_public'
  | 'set_password';

/**
 * 写入一条存储池操作审计日志
 *
 * - 审计日志失败仅 warn,不抛出(不阻塞主流程)
 * - 调用方应在「主操作完成或确定将要执行」之后调用:
 *   - 物理删除:在 WebDAV delete 之前调用,即使后续失败也保留尝试记录
 *   - 软删除:在 Prisma `deletedAt` 更新成功之后调用,避免「未执行」也被记录
 */
export async function logStorageAction(opts: {
  actorUid: string | null;
  action: StorageAction;
  path: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.storageAuditLog.create({
      data: {
        actorUid: opts.actorUid,
        action: opts.action,
        path: opts.path,
        // Prisma 的 InputJsonValue 与 Record<string, unknown> 结构性不完全兼容
        // (InputJsonValue 要求递归类型,unknown 不是 InputJsonValue 子类型),
        // 需要显式断言;实际值仍是普通 JSON 兼容对象。
        metadata: opts.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // 审计日志写入失败不应阻塞实际操作
    console.warn('[storage-audit] failed to log action', {
      action: opts.action,
      path: opts.path,
      err,
    });
  }
}
