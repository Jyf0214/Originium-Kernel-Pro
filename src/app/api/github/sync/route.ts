import { type NextRequest, NextResponse } from 'next/server';
import { getSession, isRootRole } from '@/lib/auth';
import { updateFileInGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/github/sync');

/**
 * 统一 GitHub 同步 API
 *
 * 仅支持 config-yaml 类型，config.json 已被淘汰。
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && !isRootRole(session.role))) {
    logger.warn('POST', '无权限', { role: session?.role });
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubRepo || !githubToken) {
    logger.warn('POST', 'GitHub 未配置');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { type = 'config-yaml' } = body;

    logger.info('POST', '开始同步', { type });

    if (type !== 'config-yaml') {
      logger.warn('POST', '不支持的同步类型', { type });
      return NextResponse.json({ error: getTranslate('api.github.unsupportedSyncType') }, { status: 400 });
    }

    const { content, message: commitMessage } = body;
    if (!content) {
      logger.warn('POST', 'config-yaml 缺少 content 字段');
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

    return NextResponse.json({ success: true, message: getTranslate('api.github.syncSuccess') });
  } catch (error) {
    logger.error('POST', '同步失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: getTranslate('api.github.syncFailed') },
      { status: 500 }
    );
  }
}
