/**
 * Next.js Middleware — API 路由统一认证防护
 *
 * 作为第一道防线，在请求到达具体 API 路由处理器之前进行认证检查。
 * 即使某个新路由忘记调用 requireAuth()，middleware 也能拦截未认证请求。
 *
 * 防护策略：
 * - /api/admin/**   → 必须登录 + 管理员角色
 * - /api/config     → 必须登录 + 管理员角色
 * - /api/storage/** → 必须登录（具体权限由路由内检查）
 * - /api/auth/**    → 公开（登录、注册、密码重置等）
 * - /api/health     → 公开
 * - /api/posts/**   → 公开（点赞、查询）
 * - /api/faces      → 公开
 * - /api/authors    → 公开
 * - 其他 /api/**    → 必须登录
 *
 * 注意：此 middleware 仅做粗粒度拦截，细粒度权限（如 sudo、API 密钥权限）
 * 仍由各路由内的 requireSudo() / requireApiKeyPermission() 负责。
 */
import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/** 获取 JWT 验证密钥 */
function getSecretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // 开发环境缺失时使用空密钥，middleware 仅做粗粒度拦截
    // 细粒度验证由 auth.ts 的 getSecret() 处理
    return null;
  }
  return new TextEncoder().encode(secret);
}

/** 需要管理员权限的 API 前缀 */
const ADMIN_PREFIXES = ['/api/admin/', '/api/config'];

/** 公开的 API 路径（不需要认证） */
const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/reset-password',
  '/api/auth/apikey-login',
  '/api/posts',
  '/api/posts/like',
  '/api/faces',
  '/api/authors',
  '/api/feedback',
  '/api/share',
  '/api/web-vitals',
  '/api/report-error',
]);

/** 公开路径前缀 */
const PUBLIC_PREFIXES = [
  '/api/auth/2fa/',   // 2FA 流程需要公开访问（但有临时令牌验证）
  '/api/articles',    // 文章公开查询
  '/api/diary',       // 日记公开查询（具体权限由路由控制）
  '/api/u/',          // 用户主页路由
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some(p => pathname.startsWith(p));
}

/**
 * 从 cookie 中提取并验证 JWT session
 * 返回 payload 或 null（无效/过期）
 */
async function verifySessionCookie(
  cookieValue: string,
  secretKey: Uint8Array,
): Promise<{ role?: string } | null> {
  try {
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 仅拦截 API 路由
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 获取 session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  // 无 session → 拦截
  if (!sessionCookie) {
    return NextResponse.json(
      { error: '需要登录' },
      { status: 401 },
    );
  }

  // 验证 JWT 签名
  const secretKey = getSecretKey();
  if (!secretKey) {
    // AUTH_SECRET 未配置，跳过 middleware 签名验证
    // 由各路由内的 auth 模块处理（开发环境兼容）
    return NextResponse.next();
  }

  const payload = await verifySessionCookie(sessionCookie, secretKey);
  if (!payload) {
    return NextResponse.json(
      { error: '会话无效或已过期' },
      { status: 401 },
    );
  }

  // 管理员路径：检查角色
  if (isAdminPath(pathname)) {
    const role = payload.role;
    if (role !== 'admin' && role !== 'sudo') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
