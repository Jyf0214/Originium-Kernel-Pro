/**
 * 后向链接 API
 *
 * GET /api/backlinks?section=posts&slug=/daily/2024-01-15
 *
 * 返回：
 * - backlinks: 引用了当前内容的其他内容列表
 * - outgoing: 当前内容引用的其他内容列表
 *
 * 复用 lib/content-registry.ts 的注册表和索引查询。
 */

import { NextResponse } from 'next/server';
import { getBacklinks, getOutgoingReferences } from '@/lib/content-registry';
import { apiHandler } from '@/lib/api-handler';
import { checkRateLimit } from '@/lib/rate-limit';

export const GET = apiHandler('GET', { label: '后向链接查询', requireAuth: true }, (req) => {
  const rl = checkRateLimit(req, 'backlinks', 20, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section');
  const slug = searchParams.get('slug');

  if (
    !section ||
    !slug ||
    (section !== 'posts' && section !== 'faces')
  ) {
    return NextResponse.json(
      { error: '参数无效：需要 section (posts|faces) 和 slug' },
      { status: 400 },
    );
  }

  const backlinks = getBacklinks(section, slug);
  const outgoing = getOutgoingReferences(section, slug);

  return NextResponse.json({ backlinks, outgoing }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});
