/**
 * GET /api/diary/[id]/versions/[versionId]
 * 获取单个版本详情（含内容明文）
 * 需要管理员认证
 */
import { NextResponse } from 'next/server';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getDiaryVersion } from '@/lib/diary-version';
import { getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { getTranslate } from '@/i18n/translate';

export const GET = apiHandler('GET', { label: getTranslate('api.diary.getVersionDetail'), requireAdmin: true, requireDb: true }, async (_req, context) => {
  // API 密钥认证的请求需 posts_read 权限
  const authResult = await getSessionWithKeyId();
  if (authResult) {
    const denied = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'posts_read');
    if (denied) return denied;
  }

  const versionId = await getParam(context, 'versionId');

  const version = await getDiaryVersion(versionId);
  if (!version) {
    return NextResponse.json({ error: getTranslate('api.diary.versionNotFound') }, { status: 404 });
  }

  // 解析 JSON 格式的标签
  const tags = version.tags ? (() => { try { return JSON.parse(version.tags); } catch { return []; } })() : [];

  return NextResponse.json({
    version: {
      ...version,
      tags,
    },
  });
});
