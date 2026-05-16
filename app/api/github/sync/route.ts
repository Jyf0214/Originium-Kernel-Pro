import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateFileInGithub } from '@/lib/github';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/github/sync');

/**
 * 统一 GitHub 同步 API
 *
 * 仅支持 config-yaml 类型，config.json 已被淘汰。
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    logger.warn('POST', '无权限', { role: session?.role });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubRepo || !githubToken) {
    logger.warn('POST', 'GitHub 未配置');
    return NextResponse.json({ error: 'GitHub 未配置' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { type = 'config-yaml' } = body;

    logger.info('POST', '开始同步', { type });

    if (type !== 'config-yaml') {
      logger.warn('POST', '不支持的同步类型', { type });
      return NextResponse.json({ error: '不支持的同步类型' }, { status: 400 });
    }

    const { content, message: commitMessage } = body;
    if (!content) {
      logger.warn('POST', 'config-yaml 缺少 content 字段');
      return NextResponse.json({ error: '缺少 YAML 内容' }, { status: 400 });
    }

    await updateFileInGithub({
      repo: githubRepo,
      token: githubToken,
      path: 'config.yaml',
      content,
      message: commitMessage || 'chore: update config from admin panel',
    });
    logger.info('POST', 'config.yaml 同步成功');

    return NextResponse.json({ success: true, message: 'config.yaml 同步成功' });
  } catch (error) {
    logger.error('POST', '同步失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '同步失败' },
      { status: 500 }
    );
  }
}
