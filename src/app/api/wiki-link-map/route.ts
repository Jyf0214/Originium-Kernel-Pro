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
import { apiHandler } from '@/lib/api-handler';
import { getTranslate } from '@/i18n/translate';

export const GET = apiHandler('GET', { label: getTranslate('api.wikiLinkMap.label'), requireAuth: true }, () => {
  const map = buildWikiLinkMap();
  return NextResponse.json(map, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});
