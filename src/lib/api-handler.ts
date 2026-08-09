import { type NextRequest, NextResponse } from 'next/server';
import { getSession, requireRoot, isRootRole, type SessionPayload } from '@/lib/auth';
import { getTranslate } from '@/i18n/translate';

/* ---------- API 响应性能指标 ---------- */

/** 单条指标记录 */
export interface MetricEntry {
  route: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: number;
}

/** 滑窗最大容量 */
const MAX_METRICS = 1000;

/** 模块级共享存储，所有 apiHandler 调用共享同一实例 */
const metricsBuffer: MetricEntry[] = [];

/** 追加一条指标，超过容量时丢弃最旧记录 */
function recordMetric(entry: MetricEntry) {
  if (metricsBuffer.length >= MAX_METRICS) {
    metricsBuffer.shift();
  }
  metricsBuffer.push(entry);
}

/** 获取只读副本（供 metrics 端点读取） */
export function getMetricsSnapshot(): readonly MetricEntry[] {
  return metricsBuffer;
}

/* ---------- apiHandler 本体 ---------- */

export interface ApiHandlerOptions {
  label: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireRoot?: boolean;
  /** 是否要求数据库可用，不可用时返回 503 */
  requireDb?: boolean;
}

// catch-all 路由 [...id] 返回 string[]，普通路由返回 string
type ParamValue = string | string[];
interface ApiCtx<P extends Record<string, ParamValue> = Record<string, ParamValue>> { params: Promise<P> }

/**
 * 解析 context.params 中的指定参数，并确保返回非空字符串
 */
export async function getParam<P extends Record<string, ParamValue> = Record<string, ParamValue>>(
  context: ApiCtx<P> | undefined,
  name: keyof P & string,
): Promise<string> {
  const params = (await (context?.params ?? Promise.resolve({} as P)));
  const val = params[name];
  // catch-all 路由 [...id] 返回数组，需要拼接回路径字符串
  if (Array.isArray(val)) return val.join('/');
  return (val) ?? '';
}

/**
 * 从请求 URL 提取查询参数摘要(仅记录 key,不记录敏感值)
 */
function querySummary(req: NextRequest): string {
  const keys = Array.from(req.nextUrl.searchParams.keys());
  if (keys.length === 0) return '';
  return ` params=${keys.join(',')}`;
}

/** checkAuth 返回类型：成功时携带 session，失败时携带 error */
type AuthCheckResult =
  | { error: NextResponse; session?: undefined }
  | { session: SessionPayload | null; error?: undefined };

async function checkAuth(
  options: ApiHandlerOptions,
  method: string,
  pathname: string,
  req: NextRequest,
): Promise<AuthCheckResult> {
  if (options.requireAuth || options.requireAdmin) {
    const session = await getSession();
    if (!session) {
      console.warn(`[API] ${method} ${pathname}${querySummary(req)} → 401 未登录`);
      return { error: NextResponse.json({ error: getTranslate('lib.api.unauthorized') }, { status: 401 }) };
    }
    if (options.requireAdmin && session.role !== 'admin' && !isRootRole(session.role)) {
      console.warn(`[API] ${method} ${pathname}${querySummary(req)} → 403 用户 ${session.uid} 无管理员权限`);
      return { error: NextResponse.json({ error: getTranslate('lib.api.forbidden') }, { status: 403 }) };
    }
    return { session };
  }
  if (options.requireRoot) {
    const result = await requireRoot();
    if (result instanceof NextResponse) {
      console.warn(`[API] ${method} ${pathname}${querySummary(req)} → ${result.status} root 权限验证失败`);
      return { error: result };
    }
    return { session: result };
  }
  return { session: null };
}

async function checkDb(
  options: ApiHandlerOptions,
  method: string,
  pathname: string,
): Promise<NextResponse | null> {
  if (!options.requireDb) return null;
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  if (!db.prisma) {
    console.warn(`[API] ${method} ${pathname} → 503 数据库未配置`);
    return NextResponse.json({ error: getTranslate('lib.api.dbNotConfigured') }, { status: 503 });
  }
  return null;
}

/**
 * 包装 API 路由处理器，提供统一的 try/catch + 日志 + 错误响应
 * 以及可选的权限验证
 *
 * 日志策略:
 * - 仅在异常/错误时输出日志(4xx/5xx)
 * - 成功响应不输出日志(由各路由自行按需记录业务日志)
 * - 错误日志包含完整上下文:端点、查询参数、错误信息
 */
export function apiHandler<
  P extends Record<string, ParamValue> = Record<string, ParamValue>,
>(
  method: string,
  options: ApiHandlerOptions,
  handler: (req: NextRequest, ctx?: ApiCtx<P>, session?: SessionPayload) => NextResponse | Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx?: ApiCtx<P>) => {
    const pathname = req.nextUrl.pathname;

    // 校验 HTTP 方法
    if (req.method !== method) {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { 'Cache-Control': 'private, no-store' } });
    }

    const start = performance.now();
    let statusCode = 500;

    try {
      const authResult = await checkAuth(options, method, pathname, req);
      if (authResult.error) {
        statusCode = authResult.error.status;
        authResult.error.headers.set('Cache-Control', 'private, no-store');
        return authResult.error;
      }
      const session = authResult.session ?? undefined;

      const dbErr = await checkDb(options, method, pathname);
      if (dbErr) {
        statusCode = dbErr.status;
        dbErr.headers.set('Cache-Control', 'private, no-store');
        return dbErr;
      }

      const response = await handler(req, ctx, session);
      statusCode = response.status;
      // 写方法统一禁止缓存，防止浏览器/CDN 意外缓存 mutation 响应
      if (method !== 'GET' && method !== 'HEAD') {
        response.headers.set('Cache-Control', 'private, no-store');
      }
      return response;
    } catch (error) {
      const errHeaders = { 'Cache-Control': 'private, no-store' };
      // 格式错误的 JSON 请求体应返回 400 而非 500
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        statusCode = 400;
        console.warn(`[API] ${method} ${pathname}${querySummary(req)} → 400 请求体格式错误`);
        return NextResponse.json({ error: getTranslate('lib.api.badJsonBody') }, { status: 400, headers: errHeaders });
      }
      statusCode = 500;
      const err = error instanceof Error ? error : new Error(String(error));
      // 服务端日志记录完整错误信息（仅管理员可见）
      console.error(`[API] ${method} ${pathname}${querySummary(req)} → 500 ${options.label} 失败`, {
        message: err.message,
        stack: err.stack,
      });
      // 生产环境：仅返回通用错误消息，不泄露任何内部信息
      // 开发环境：返回简化错误（仍不返回堆栈）
      const errorMsg = process.env.NODE_ENV === 'production'
        ? getTranslate('lib.api.serverError')
        : getTranslate('lib.api.actionFailed', { label: options.label });
      return NextResponse.json({ error: errorMsg }, { status: 500, headers: errHeaders });
    } finally {
      const latencyMs = performance.now() - start;
      recordMetric({
        route: pathname,
        method,
        statusCode,
        latencyMs: Math.round(latencyMs * 100) / 100,
        timestamp: Date.now(),
      });
    }
  };
}

/** 快速错误响应工厂 */
export const ApiErr = {
  unauthorized: (msg = getTranslate('lib.api.unauthorized')) => NextResponse.json({ error: msg }, { status: 401 }),
  forbidden: (msg = getTranslate('lib.api.forbidden')) => NextResponse.json({ error: msg }, { status: 403 }),
  notFound: (msg = getTranslate('lib.api.notFound')) => NextResponse.json({ error: msg }, { status: 404 }),
  badRequest: (msg = getTranslate('lib.api.badRequest')) => NextResponse.json({ error: msg }, { status: 400 }),
  serverError: (msg = getTranslate('lib.api.serverError')) => NextResponse.json({ error: msg }, { status: 500 }),
  /**
   * 结构化错误响应，携带错误码和可选的详细信息
   * 便于前端统一处理错误、展示定位信息和错误上报
   */
  structured: (
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) => NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status: 400 },
  ),
};
