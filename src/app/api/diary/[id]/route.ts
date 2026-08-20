import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';
import { diaryReadGuard } from '@/lib/diary-guard';
import { encryptContent, decryptContent } from '@/lib/diary-crypto';
import { saveDiaryVersion } from '@/lib/diary-version';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { isScheduledPending } from '@/lib/diary-schedule';
import { validateDiaryInput } from '@/lib/diary-input';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/diary/[id]');

/**
 * API 密钥细粒度权限检查（日记读写）
 * Cookie 认证(浏览器)由 diaryReadGuard/requireAdmin 处理；密钥认证检查 posts_* 权限
 */
async function requireDiaryPerm(action: 'posts_read' | 'posts_write' | 'posts_delete'): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, action);
}

export const GET = apiHandler('GET', { label: getTranslate('api.diary.getDiary'), requireDb: true }, async (req, context) => {
  const guard = await diaryReadGuard();
  if (guard) return guard;

  // API 密钥认证的请求需 posts_read 权限
  const denied = await requireDiaryPerm('posts_read');
  if (denied) return denied;

  const id = await getParam(context, 'id');
  const diary = await prisma.diary.findUnique({ where: { id } });
  if (!diary) {
    return NextResponse.json({ error: getTranslate('api.diary.notFound') }, { status: 404 });
  }

  // 定时未到期日记对外不可见（与列表 scheduledFilter 保持一致），返回 404 避免泄露存在性
  if (isScheduledPending(diary)) {
    return NextResponse.json({ error: getTranslate('api.diary.notFound') }, { status: 404 });
  }

  const decrypted = await decryptContent(diary.content);

  return NextResponse.json({ diary: { ...diary, content: decrypted, scheduledAt: diary.scheduledAt?.toISOString() ?? null } });
});

export const PUT = apiHandler('PUT', { label: getTranslate('api.diary.updateDiary'), requireAdmin: true, requireDb: true }, async (req, context, session) => {
  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireDiaryPerm('posts_write');
  if (denied) return denied;

  const id = await getParam(context, 'id');
  const body = await req.json() as Record<string, unknown>;
  const validation = validateDiaryInput(body);
  if (!validation.ok) {
    void logAudit('diary_update_failed', 'diary', '更新日记失败：输入校验未通过', session!.uid);
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { title, content, tags, date, group, scheduledAt, references } = validation.value;

  const existing = await prisma.diary.findUnique({ where: { id } });
  if (!existing) {
    void logAudit('diary_update_failed', 'diary', `更新日记失败：日记不存在（${id}）`, session!.uid);
    return NextResponse.json({ error: getTranslate('api.diary.notFound') }, { status: 404 });
  }

  const encrypted = await encryptContent(content);

  // 设置了定时发布时间 → 状态为 draft，否则为 published（非法时间已在校验层拦截）
  const isScheduled = scheduledAt !== undefined && scheduledAt.getTime() > Date.now();

  const diary = await prisma.diary.update({
    where: { id },
    data: {
      title,
      content: encrypted,
      tags,
      group,
      references,
      date,
      status: isScheduled ? 'draft' : 'published',
      scheduledAt: isScheduled ? scheduledAt : null,
    },
  });

  // 更新成功后再保存版本快照，避免 update 失败时产生幽灵版本
  await saveDiaryVersion(id, content, title, tags);

  logger.info('PUT', '更新日记成功', { id, title, scheduled: isScheduled });
  void logAudit('diary_update', 'diary', `更新日记：${title}`, session!.uid);
  return NextResponse.json({ diary });
});

export const PATCH = apiHandler('PATCH', { label: getTranslate('api.diary.togglePin'), requireAdmin: true, requireDb: true }, async (req, context, session) => {
  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireDiaryPerm('posts_write');
  if (denied) return denied;

  const id = await getParam(context, 'id');
  const existing = await prisma.diary.findUnique({ where: { id } });
  if (!existing) {
    void logAudit('diary_toggle_pin_failed', 'diary', `置顶状态切换失败：日记不存在（${id}）`, session!.uid);
    return NextResponse.json({ error: getTranslate('api.diary.notFound') }, { status: 404 });
  }

  const diary = await prisma.diary.update({
    where: { id },
    data: { pinned: !existing.pinned },
    select: { id: true, pinned: true },
  });

  logger.info('PATCH', `${diary.pinned ? '置顶' : '取消置顶'}日记成功`, { id });
  void logAudit('diary_toggle_pin', 'diary', `置顶状态切换：${diary.id}（${diary.pinned ? '置顶' : '取消置顶'}）`, session!.uid);
  return NextResponse.json({ diary });
});

export const DELETE = apiHandler('DELETE', { label: getTranslate('api.diary.deleteDiary'), requireAdmin: true, requireDb: true }, async (req, context, session) => {
  // API 密钥认证的请求需 posts_delete 权限
  const denied = await requireDiaryPerm('posts_delete');
  if (denied) return denied;

  const id = await getParam(context, 'id');
  const existing = await prisma.diary.findUnique({ where: { id } });
  if (!existing) {
    void logAudit('diary_delete_failed', 'diary', `删除日记失败：日记不存在（${id}）`, session!.uid);
    return NextResponse.json({ error: getTranslate('api.diary.notFound') }, { status: 404 });
  }

  await prisma.diary.delete({ where: { id } });

  logger.info('DELETE', '删除日记成功', { id });
  void logAudit('diary_delete', 'diary', `删除日记：${id}`, session!.uid);
  return NextResponse.json({ success: true });
});
