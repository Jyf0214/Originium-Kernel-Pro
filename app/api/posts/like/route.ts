import { NextResponse, type NextRequest } from 'next/server';

/**
 * 文章点赞 API
 *
 * - GET  /api/posts/like?slug=xxx  → 返回 { count: number }
 * - POST /api/posts/like           → 接收 { slug: string }，计数+1，返回 { count: number }
 *
 * 使用内存 Map 存储，边缘环境每次冷启动重置，可接受。
 * 客户端用 localStorage 记录用户已点赞的 slug，防止重复计数。
 */

// 内存计数存储：slug → 点赞数
const likeCounts = new Map<string, number>();

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
    const body = await req.json();
    const { slug } = body as { slug?: string };
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: '缺少 slug 字段' }, { status: 400 });
    }
    const current = likeCounts.get(slug) ?? 0;
    const newCount = current + 1;
    likeCounts.set(slug, newCount);
    return NextResponse.json({ count: newCount });
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }
}
