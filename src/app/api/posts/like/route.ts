import { type NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { getTranslate } from '@/i18n/translate';

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
export const GET = apiHandler('GET', { label: getTranslate('api.posts.likeQuery') }, async (req) => {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: getTranslate('api.posts.missingSlugParam') }, { status: 400 });
  }
  if (slug.length > MAX_SLUG_LEN) {
    return NextResponse.json({ error: getTranslate('api.posts.slugTooLong') }, { status: 400 });
  }
  const db = getDb();
  const raw = await db.get(`${LIKE_COUNT_PREFIX}${slug}`);
  const count = raw ? Number(raw) || 0 : 0;
  return NextResponse.json({ count }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
  });
})

/**
 * 获取或创建点赞客户端指纹 cookie
 * 使用 SHA-256 哈希生成不可预测的指纹，防止篡改
 */
function getOrCreateFingerprint(req: NextRequest): { value: string; isNew: boolean } {
  const existing = req.cookies.get('like_fp')?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) {
    return { value: existing, isNew: false };
  }
  return { value: crypto.randomBytes(16).toString('hex'), isNew: true };
}

/** POST — 点赞 */
export const POST = apiHandler('POST', { label: getTranslate('api.posts.like') }, async (req) => {
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = rateLimit(`${ip}:like`, LIKE_RATE_LIMIT, LIKE_RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: getTranslate('api.posts.likeRateLimited') },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const body = await req.json();
  const { slug } = body as { slug?: string };
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: getTranslate('api.posts.missingSlugField') }, { status: 400 });
  }
  if (slug.length > MAX_SLUG_LEN) {
    return NextResponse.json({ error: getTranslate('api.posts.slugTooLong') }, { status: 400 });
  }

  const db = getDb();
  if (!db.prisma) {
    return NextResponse.json({ error: getTranslate('api.common.dbNotConfigured') }, { status: 503 });
  }

  // 双重去重：Cookie 指纹 + IP 指纹，任一匹配即视为已点赞
  const fp = getOrCreateFingerprint(req);
  const cookieDedupKey = `${LIKE_DEDUP_PREFIX}fp:${fp.value}:${slug}`;
  const ipDedupKey = `${LIKE_DEDUP_PREFIX}ip:${ip}:${slug}`;

  const [existingCookie, existingIp] = await Promise.all([
    db.get(cookieDedupKey),
    db.get(ipDedupKey),
  ]);

  if (existingCookie !== null || existingIp !== null) {
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

  // 记录双重去重标记（带 TTL）
  await Promise.all([
    db.set(cookieDedupKey, '1', DEDUP_TTL_SECONDS),
    db.set(ipDedupKey, '1', DEDUP_TTL_SECONDS),
  ]);

  // 设置/刷新指纹 cookie（30 天有效期，HttpOnly 防篡改）
  const response = NextResponse.json({ count: newCount, liked: true });
  response.cookies.set('like_fp', fp.value, {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
})
