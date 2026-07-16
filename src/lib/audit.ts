/**
 * 审计日志模块
 * 记录管理员操作到 Prisma auditLog 表
 */
import { prisma } from '@/lib/db';

/** 记录审计日志 */
export async function logAudit(
  action: string,
  target: string,
  detail: string | null,
  userId: string,
  _extra?: Record<string, unknown>,
): Promise<void> {
  if (!prisma || !('auditLog' in prisma)) {
    console.warn('[audit] prisma.auditLog 不可用，跳过审计日志写入');
    return;
  }
  try {
    await prisma.auditLog.create({
      data: {
        action,
        target,
        detail: detail ?? null,
        userId,
      },
    });
  } catch {
    // 审计日志写入失败不应阻断业务流程
    console.error('[audit] 写入审计日志失败', { action, target, detail, userId });
  }
}

/** 查询审计日志 */
export async function queryAuditLogs(options: {
  action?: string;
  target?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: unknown[]; total: number }> {
  const { action, target, userId, limit = 50, offset = 0 } = options;
  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (target) where.target = target;
  if (userId) where.userId = userId;

  if (!prisma || !('auditLog' in prisma)) {
    console.warn('[audit] prisma.auditLog 不可用，返回空结果');
    return { items: [], total: 0 };
  }
  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  } catch {
    return { items: [], total: 0 };
  }
}
