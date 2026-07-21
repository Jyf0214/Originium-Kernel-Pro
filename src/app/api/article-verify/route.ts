/**
 * ⚠️ 警告：此文件是动态 API 路由
 *
 * 绝对不要在此文件中添加 `export const dynamic = 'force-static'` 或 `export const revalidate = false`。
 * API 路由天然是动态的，静态导出模式下通过 filter-db-routes.mjs 脚本整体移除，
 * 而不是通过 Next.js 的 dynamic 导出使其"静态化"。
 *
 * 新增 API 路由时，必须同步更新 scripts/filter-db-routes.mjs 的 DB_ROUTE_PATHS 列表，
 * 否则静态导出构建会失败。
 *
 * 文章密码验证 API
 *
 * POST /api/article-verify
 * 请求体：{ slug: string, password: string }
 * 响应：{ valid: boolean } 或 { error: string }
 *
 * 服务端验证：将用户输入通过 SHA-256 哈希后与 frontmatter 中存储的哈希比对
 * 仅在 SSR 模式下可用（静态导出模式下此路由不存在）
 *
 * 安全设计：
 * - 密码明文仅在服务端处理，不返回给客户端
 * - 哈希比对在服务端完成，防止客户端篡改
 * - 带请求频率限制，防止暴力破解
 */
import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { getContentFile } from '@/lib/content';
import { rateLimit } from '@/lib/rate-limit';
import { createHash } from 'crypto';

/** 对输入文本进行 SHA-256 哈希（与客户端 Web Crypto 实现一致） */
function sha256Hex(message: string): string {
  return createHash('sha256').update(message, 'utf8').digest('hex');
}

export const POST = apiHandler(
  'POST',
  { label: '文章密码验证' },
  async (req) => {
    const body = await req.json() as { slug?: string; password?: string };
    const { slug, password } = body;

    // 参数校验
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '缺少密码参数' }, { status: 400 });
    }

    // 请求频率限制：每个 IP 每分钟最多 10 次验证尝试
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const rl = rateLimit(`article-verify:${ip}`, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: '验证请求过于频繁，请稍后再试' },
        { status: 429 },
      );
    }

    // 从文件系统读取文章元数据
    const file = getContentFile('posts', slug);
    if (!file) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    // 检查文章是否设置了密码保护
    const passwordHash = typeof file.meta.password === 'string' ? file.meta.password : '';
    if (!passwordHash) {
      // 文章未设置密码，视为无需验证
      return NextResponse.json({ valid: true });
    }

    // 服务端 SHA-256 哈希比对
    const inputHash = sha256Hex(password.trim());
    const valid = inputHash === passwordHash;

    return NextResponse.json({ valid });
  },
);
