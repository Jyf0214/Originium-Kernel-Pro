import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * 文章点赞 API
 *
 * - GET  /api/posts/like?slug=xxx  → 返回 { count: number }
 * - POST /api/posts/like           → 接收 { slug: string }，计数+1，返回 { count: number }
 *
 * 使用内存 Map 存储，边缘环境每次冷启动重置，可接受。
 * 客户端用 localStorage 记录用户已点赞的 slug，防止重复计数。
 * 服务端通过 IP 级频率限制和 IP+slug 去重防止恶意刷赞。
 */

// 内存计数存储：slug → 点赞数
const likeCounts = new Map<string, number>();

// IP+slug 去重存储：记录每个 IP 对每个 slug 的点赞记录
// 格式："ip:slug" → true，防止同一 IP 重复点赞同一文章
const likeDedup = new Map<string, boolean>();

/** 频率限制：每 IP 每分钟最多 10 次点赞请求 */
const LIKE_RATE_LIMIT = 10;
const LIKE_RATE_WINDOW_MS = 60 * 1000;

/** 去重缓存过期时间：24 小时（防止冷启动后大量重复写入） */
const DEDUP_EXPIRY_MS = 24 * 60 * 60 * 1000;
const likeDedupExpiry = new Map<string, number>();

/** 定期清理过期去重记录，防止内存无限增长 */
let lastDedupCleanup = Date.now();
function cleanupDedup(now: number): void {
  if (now - lastDedupCleanup < 60_000) return;
  lastDedupCleanup = now;
  for (const [key, expiry] of likeDedupExpiry) {
    if (now > expiry) {
      likeDedup.delete(key);
      likeDedupExpiry.delete(key);
    }
  }
}

export function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
  }
  const count = likeCounts.get(slug) ?? 0;
  return NextResponse.json({ count });
}

export async function POST(req: NextRequest) {
  try {
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

    // IP+slug 去重：同一 IP 对同一文章只计一次赞
    const dedupKey = `${ip}:${slug}`;
    const now = Date.now();
    cleanupDedup(now);

    if (likeDedup.has(dedupKey)) {
      // 已点过赞，返回当前计数但不递增
      const current = likeCounts.get(slug) ?? 0;
      return NextResponse.json({ count: current, liked: true });
    }

    const current = likeCounts.get(slug) ?? 0;
    const newCount = current + 1;
    likeCounts.set(slug, newCount);

    // 记录去重标记
    likeDedup.set(dedupKey, true);
    likeDedupExpiry.set(dedupKey, now + DEDUP_EXPIRY_MS);

    return NextResponse.json({ count: newCount, liked: true });
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }
}
