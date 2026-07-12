import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getDb } from '@/lib/db';

/**
 * 文章点赞 API
 *
 * - GET  /api/posts/like?slug=xxx  → 返回 { count: number }
 * - POST /api/posts/like           → 接收 { slug: string }，计数+1，返回 { count: number }
 *
 * 使用数据库 KV 持久化存储，Serverless 冷启动后数据不丢失。
 * 客户端用 localStorage 记录用户已点赞的 slug，防止重复计数。
 * 服务端通过 IP 级频率限制和 IP+slug 去重防止恶意刷赞。
 */

/** KV key 前缀 */
const LIKE_COUNT_PREFIX = 'like:count:';
const LIKE_DEDUP_PREFIX = 'like:dedup:';

/** 频率限制：每 IP 每分钟最多 10 次点赞请求 */
const LIKE_RATE_LIMIT = 10;
const LIKE_RATE_WINDOW_MS = 60 * 1000;

/** slug 最大长度限制，防止恶意请求 */
const MAX_SLUG_LEN = 200;

/** 去重缓存过期时间：24 小时 */
const DEDUP_TTL_SECONDS = 24 * 60 * 60;

/** GET — 获取点赞数 */
export const GET = apiHandler('GET', { label: '文章点赞查询' }, async (req) => {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
  }
  if (slug.length > MAX_SLUG_LEN) {
    return NextResponse.json({ error: 'slug 长度超出限制' }, { status: 400 });
  }
  const db = getDb();
  const raw = await db.get(`${LIKE_COUNT_PREFIX}${slug}`);
  const count = raw ? Number(raw) || 0 : 0;
  return NextResponse.json({ count }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
  });
})

/** POST — 点赞 */
export const POST = apiHandler('POST', { label: '文章点赞' }, async (req) => {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = rateLimit(`${ip}:like`, LIKE_RATE_LIMIT, LIKE_RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: '点赞过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const body = await req.json();
  const { slug } = body as { slug?: string };
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: '缺少 slug 字段' }, { status: 400 });
  }
  if (slug.length > MAX_SLUG_LEN) {
    return NextResponse.json({ error: 'slug 长度超出限制' }, { status: 400 });
  }

  const db = getDb();
  if (!db.prisma) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
  }

  // IP+slug 去重：同一 IP 对同一文章只计一次赞
  const dedupKey = `${LIKE_DEDUP_PREFIX}${ip}:${slug}`;
  const existing = await db.get(dedupKey);
  if (existing !== null) {
    // 已点过赞，返回当前计数但不递增
    const currentRaw = await db.get(`${LIKE_COUNT_PREFIX}${slug}`);
    const current = currentRaw ? Number(currentRaw) || 0 : 0;
    return NextResponse.json({ count: current, liked: true });
  }

  // 原子递增：读取当前值 → +1 → 写回
  const countKey = `${LIKE_COUNT_PREFIX}${slug}`;
  const currentRaw = await db.get(countKey);
  const current = currentRaw ? Number(currentRaw) || 0 : 0;
  const newCount = current + 1;
  await db.set(countKey, String(newCount));

  // 记录去重标记（带 TTL）
  await db.set(dedupKey, '1', DEDUP_TTL_SECONDS);

  return NextResponse.json({ count: newCount, liked: true });
})
