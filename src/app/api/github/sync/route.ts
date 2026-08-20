import { type NextRequest, NextResponse } from 'next/server';
import { getSession, isRootRole, getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { updateFileInGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/github/sync');

/**
 * 统一 GitHub 同步 API
 *
 * 仅支持 config-yaml 类型，config.json 已被淘汰。
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const auditUser = session?.uid ?? 'unknown';
  if (!session || (session.role !== 'admin' && !isRootRole(session.role))) {
    logger.warn('POST', '无权限');
    void logAudit('github_sync_failed', 'github', 'GitHub 同步失败：无权限', auditUser);
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }

  // API 密钥认证的请求需 posts_write 权限
  const authResult = await getSessionWithKeyId();
  if (authResult) {
    const permErr = await requireApiKeyPermission(authResult.session, authResult.currentKeyId, 'posts_write');
    if (permErr) return permErr;
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubRepo || !githubToken) {
    logger.warn('POST', 'GitHub 未配置');
    void logAudit('github_sync_failed', 'github', 'GitHub 同步失败：GitHub 未配置', auditUser);
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { type = 'config-yaml' } = body;

    logger.info('POST', '开始同步', { type });

    if (type !== 'config-yaml') {
      logger.warn('POST', '不支持的同步类型', { type });
      void logAudit('github_sync_failed', 'github', `GitHub 同步失败：不支持的同步类型（${String(type)}）`, auditUser);
      return NextResponse.json({ error: getTranslate('api.github.unsupportedSyncType') }, { status: 400 });
    }

    const { content, message: commitMessage } = body;
    if (!content) {
      logger.warn('POST', 'config-yaml 缺少 content 字段');
      void logAudit('github_sync_failed', 'github', 'GitHub 同步失败：config-yaml 缺少 content 字段', auditUser);
      return NextResponse.json({ error: getTranslate('api.github.missingYamlContent') }, { status: 400 });
    }

    await updateFileInGithub({
      repo: githubRepo,
      token: githubToken,
      path: 'config.yaml',
      content,
      message: commitMessage ?? 'chore: update config from admin panel',
    });
    logger.info('POST', 'config.yaml 同步成功');
    void logAudit('github_sync', 'github', 'GitHub 同步成功：config.yaml', auditUser);

    return NextResponse.json({ success: true, message: getTranslate('api.github.syncSuccess') });
  } catch (error) {
    logger.error('POST', '同步失败', { error: String(error) });
    void logAudit('github_sync_failed', 'github', 'GitHub 同步失败', auditUser);
    return NextResponse.json(
      { error: getTranslate('api.github.syncFailed') },
      { status: 500 }
    );
  }
}
