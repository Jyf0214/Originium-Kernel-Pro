import { type NextRequest, NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/api-logger';
import { getSession, requireSudo } from '@/lib/auth';

export interface ApiHandlerOptions {
  label: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireSudo?: boolean;
}

interface ApiCtx<P extends Record<string, unknown>> { params: Promise<P> }

/**
 * 解析 context.params 中的指定参数，并确保返回非空字符串
 */
export async function getParam<P extends Record<string, unknown> = Record<string, string>>(
  context: ApiCtx<P> | undefined,
  name: keyof P & string,
): Promise<string> {
  const params = (await (context?.params ?? Promise.resolve({} as P)));
  return (params[name] as unknown as string | undefined) ?? '';
}

/**
 * 包装 API 路由处理器，提供统一的 try/catch + 日志 + 错误响应
 * 以及可选的权限验证
 */
export function apiHandler<
  P extends Record<string, unknown> = Record<string, string>,
>(
  method: string,
  options: ApiHandlerOptions,
  handler: (req: NextRequest, ctx?: ApiCtx<P>) => NextResponse | Promise<NextResponse>,
) {
  const logger = createApiLogger(options.label);
  return async (req: NextRequest, ctx?: ApiCtx<P>) => {
    const start = performance.now();
    const pathname = req.nextUrl.pathname;

    /** 记录请求耗时，非 4xx/5xx 使用 console.warn */
    const logResponse = (status: number) => {
      const duration = Math.round(performance.now() - start);
      const msg = `[API] ${method} ${pathname} → ${status} (${duration}ms)`;
      console.warn(msg);
    };

    try {
      // 权限验证
      if (options.requireAuth || options.requireAdmin) {
        const session = await getSession();
        if (!session) {
          logResponse(401);
          return NextResponse.json({ error: '未登录' }, { status: 401 });
        }
        if (options.requireAdmin && session.role !== 'admin' && session.role !== 'sudo') {
          logResponse(403);
          return NextResponse.json({ error: '无权限访问' }, { status: 403 });
        }
      }
      if (options.requireSudo) {
        const result = await requireSudo();
        if (result instanceof NextResponse) {
          logResponse(result.status);
          return result;
        }
      }
      const response = await handler(req, ctx);
      logResponse(response.status);
      return response;
    } catch (error) {
      logResponse(500);
      const msg = `${options.label} 失败`;
      logger.error(method, msg, {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}

/** 快速错误响应工厂 */
export const ApiErr = {
  unauthorized: (msg = '未登录') => NextResponse.json({ error: msg }, { status: 401 }),
  forbidden: (msg = '无权限访问') => NextResponse.json({ error: msg }, { status: 403 }),
  notFound: (msg = '资源不存在') => NextResponse.json({ error: msg }, { status: 404 }),
  badRequest: (msg = '请求参数错误') => NextResponse.json({ error: msg }, { status: 400 }),
  serverError: (msg = '服务器内部错误') => NextResponse.json({ error: msg }, { status: 500 }),
};
