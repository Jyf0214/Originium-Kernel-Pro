import { type NextRequest, NextResponse } from 'next/server';

/**
 * Edge Runtime 兼容的数据库检测
 *
 * 与 lib/config.ts:hasDatabase() 逻辑完全一致，但不导入任何 Node.js 模块，
 * 仅使用 process.env，可在 Middleware / Edge Runtime 中安全运行。
 */
function hasDatabase(): boolean {
  return !!(
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING
  );
}

/** 无数据库时需要拦截的路径前缀 */
const DB_REQUIRED_PREFIXES = [
  '/dashboard',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/admin',
  '/api/page/sdk/comments',
];

function isDbRequiredPath(pathname: string): boolean {
  return DB_REQUIRED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

/**
 * Next.js 16 Proxy (原 middleware.ts)
 *
 * 功能：
 * 1. 数据库未配置时，拦截所有需要数据库的路由（返回 503）
 * 2. 认证检查由各页面/API 自行处理
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 数据库未配置时，拦截后台高级功能路由
  if (!hasDatabase() && isDbRequiredPath(pathname)) {
    // API 路由返回 JSON 503
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '数据库未配置，此功能不可用', code: 'FEATURE_DISABLED' },
        { status: 503 },
      );
    }
    // 页面路由重定向到首页（避免暴露后台入口）
    const homeUrl = new URL('/', req.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}
