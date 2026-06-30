/**
 * Wiki-link 标题解析映射 API
 *
 * GET /api/wiki-link-map
 *
 * 返回所有 posts 和 faces 内容的标题→URL 映射，
 * 供客户端 MarkdownRenderer 在渲染日记等动态内容时解析 [[标题]] 语法。
 *
 * 需认证访问，防止未授权用户枚举全部内容标题。
 */

import { NextResponse } from 'next/server';
import { buildWikiLinkMap } from '@/lib/content-registry';
import { createApiLogger } from '@/lib/api-logger';
import { getSession } from '@/lib/auth';

const logger = createApiLogger('/api/wiki-link-map');

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  logger.info('GET', '获取 wiki-link 映射表');
  try {
    const map = buildWikiLinkMap();
    return NextResponse.json(map);
  } catch (err) {
    logger.error('GET', '获取 wiki-link 映射表失败', { error: String(err) });
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
