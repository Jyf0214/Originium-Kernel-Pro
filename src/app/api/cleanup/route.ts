import { type NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDb } from '@/lib/db';
import { type SessionPayload, getSession, isRootRole, getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { getEnvConfig } from '@/lib/env';
import { deleteFileFromGithub } from '@/lib/github';
import { DELETION_PERIOD_DAYS } from '@/lib/constants';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { deleteDraft } from '@/lib/draft-storage';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/cleanup');

/**
 * Cleanup Cron Job API
 * Automatically deletes articles that have been in pending_deletion status for more than 30 days
 *
 * This should be called periodically (e.g., daily) by a cron scheduler
 */

async function isCleanupAuthorized(req: NextRequest): Promise<{ session: SessionPayload | null; authorized: boolean }> {
  const session = await getSession();
  if (session && (session.role === 'admin' || isRootRole(session.role))) {
    return { session, authorized: true };
  }
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (!cronSecret || !expectedSecret) return { session: null, authorized: false };
  try {
    const authorized = timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedSecret));
    return { session: null, authorized };
  } catch {
    return { session: null, authorized: false };
  }
}

/**
 * API 密钥细粒度权限检查（清理任务管理）
 * Cookie 认证(浏览器)或 cron secret 请求不受影响；密钥认证检查 audit_read 权限
 */
async function requireCleanupPerm(): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'audit_read');
}

/** 尝试删除 GitHub 上的文章文件；文件不存在(404)视为已删除，网络/API 错误抛出由调用方保留记录等待下次重试 */
async function tryDeleteGithubFile(slug: string): Promise<void> {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) return;
  await deleteFileFromGithub(env.githubRepo, env.githubToken, `posts${slug}.md`);
}

/** 判断文章是否已过期并执行清理 */
async function cleanupExpiredArticle(
  id: string,
  data: string,
  db: ReturnType<typeof getDb>,
  now: number,
  periodMs: number,
): Promise<boolean> {
  const article = JSON.parse(data);
  if (article.status !== 'pending_deletion' || !article.deletionRequestedAt) return false;
  const requestedAt = new Date(article.deletionRequestedAt).getTime();
  if (now <= requestedAt + periodMs) return false;

  if (article.slug && typeof article.slug === 'string') {
    await tryDeleteGithubFile(article.slug);
  }
  await db.del(`article:data:${id}`);
  await db.hdel('articles:index', id);
  await db.hdel('articles:published', id);
  await db.hdel('articles:drafts', id);
  try { await deleteDraft(id); } catch { /* 草稿清理失败不影响删除 */ }
  return true;
}

export const POST = apiHandler('POST', { label: getTranslate('api.cleanup.cleanupExpiredArticles') }, async (req: NextRequest) => {
  // API 密钥认证的请求需 audit_read 权限（cron secret 请求无密钥，不受影响）
  const permErr = await requireCleanupPerm();
  if (permErr) return permErr;

  const { session, authorized } = await isCleanupAuthorized(req);
  if (!authorized) {
    logger.warn('POST', '未授权');
    void logAudit('cleanup_failed', 'posts', '清理过期文章失败：未授权', session?.uid ?? 'unknown');
    return NextResponse.json({ error: getTranslate('api.cleanup.unauthorized') }, { status: 401 });
  }

  logger.info('POST', '开始清理过期文章');
  const db = getDb();
  const index = await db.hgetall('articles:index');

  const now = Date.now();
  const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  const deleted: string[] = [];
  const errors: string[] = [];

  for (const [id, data] of Object.entries(index)) {
    try {
      const deleted_art = await cleanupExpiredArticle(id, data, db, now, periodMs);
      if (deleted_art) deleted.push(id);
    } catch (error: unknown) {
      console.error(`[cleanup] 处理文章 ${id} 失败:`, error);
      errors.push(getTranslate('api.cleanup.processFailed'));
    }
  }

  logger.info('POST', '清理任务完成', { deletedCount: deleted.length, errorCount: errors.length });
  void logAudit('cleanup', 'posts', `清理过期文章完成：删除 ${deleted.length} 篇`, session?.uid ?? 'unknown');
  return NextResponse.json({
    success: true,
    message: getTranslate('api.cleanup.completed', { count: deleted.length }),
    deletedCount: deleted.length,
    errorCount: errors.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get cleanup statistics
 */
export async function GET() {
  try {
    // API 密钥认证的请求需 audit_read 权限
    const permErr = await requireCleanupPerm();
    if (permErr) return permErr;

    const session = await getSession();
    if (!session || (session.role !== 'admin' && !isRootRole(session.role))) {
      logger.warn('GET', '未授权', { role: session?.role });
      return NextResponse.json({ error: getTranslate('api.cleanup.unauthorized') }, { status: 401 });
    }

    logger.info('GET', '获取清理统计');
    const db = getDb();
    const index = await db.hgetall('articles:index');

    const now = Date.now();
    const periodMs = DELETION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

    let pendingDeletion = 0;
    let expiringSoon = 0; // Within 7 days
    let expired = 0;

    for (const [, data] of Object.entries(index)) {
      let article;
      try {
        article = JSON.parse(data);
      } catch (error: unknown) {
        console.error('[cleanup] 解析文章数据失败:', error);
        continue;
      }

      if (article.status === 'pending_deletion' && article.deletionRequestedAt) {
        pendingDeletion++;

        const requestedAt = new Date(article.deletionRequestedAt).getTime();
        const expiresAt = requestedAt + periodMs;
        const daysRemaining = (expiresAt - now) / (24 * 60 * 60 * 1000);

        if (daysRemaining <= 0) {
          expired++;
        } else if (daysRemaining <= 7) {
          expiringSoon++;
        }
      }
    }

    logger.info('GET', '清理统计获取成功', { pendingDeletion, expiringSoon, expired });
    return NextResponse.json({
      pendingDeletion,
      expiringSoon,
      expired,
      deletionPeriodDays: DELETION_PERIOD_DAYS,
    });
  } catch (error: unknown) {
    logger.error('GET', '获取清理统计错误', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.cleanup.statsFailed') }, { status: 500 });
  }
}
