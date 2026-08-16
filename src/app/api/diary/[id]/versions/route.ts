/**
 * GET /api/diary/[id]/versions
 * 获取指定日记的版本历史列表（按时间倒序）
 * 需要管理员认证
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getDiaryVersions } from '@/lib/diary-version';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { getTranslate } from '@/i18n/translate';

export const GET = apiHandler('GET', { label: getTranslate('api.diary.getVersionHistory'), requireAdmin: true, requireDb: true }, async (_req, context) => {
  // API 密钥认证的请求需 posts_read 权限
  const authResult = await getSessionWithKeyId();
  if (authResult) {
    const denied = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'posts_read');
    if (denied) return denied;
  }

  const diaryId = await getParam(context, 'id');

  // 验证日记存在
  const diary = await prisma.diary.findUnique({ where: { id: diaryId }, select: { id: true } });
  if (!diary) {
    return NextResponse.json({ error: getTranslate('api.diary.notFound') }, { status: 404 });
  }

  const versions = await getDiaryVersions(diaryId);

  return NextResponse.json({ versions });
});
