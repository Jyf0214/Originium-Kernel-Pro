import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/* ============================
 * Mock 声明（必须在顶层）
 * ============================ */

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
  requireSudo: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

import { apiHandler, getParam, getMetricsSnapshot } from '@/lib/api-handler';
import { getSession, requireSudo } from '@/lib/auth';

/* ============================
 * 辅助工具
 * ============================ */

/** 构造一个最简 NextRequest */
function makeRequest(
  method: string,
  path = '/api/test',
  body?: unknown,
): NextRequest {
  if (body !== undefined) {
    return new NextRequest(new URL(path, 'http://localhost'), {
      method,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextRequest(new URL(path, 'http://localhost'), { method });
}

/** 从 NextResponse 中提取 JSON body */
async function readJson(res: NextResponse) {
  return res.json();
}

/** 通用成功响应 handler，避免深层嵌套回调 */
const okHandler = () => NextResponse.json({ ok: true });

/* ============================
 * 测试套件
 * ============================ */

describe('apiHandler', () => {
  const logWarn = vi.spyOn(console, 'warn').mockImplementation(() => { /* noop */ });
  const logError = vi.spyOn(console, 'error').mockImplementation(() => { /* noop */ });

  beforeEach(() => {
    vi.clearAllMocks();
    logWarn.mockClear();
    logError.mockClear();
  });

  /* ---------- HTTP 方法校验 ---------- */

  describe('HTTP 方法校验', () => {
    test('方法不匹配时返回 405', async () => {
      const req = makeRequest('POST');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      expect(res.status).toBe(405);

      const body = await readJson(res);
      expect(body.error).toBe('Method not allowed');
    });

    test('方法匹配时正常执行 handler', async () => {
      const req = makeRequest('GET');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      expect(res.status).toBe(200);

      const body = await readJson(res);
      expect(body.ok).toBe(true);
    });
  });

  /* ---------- 权限验证 ---------- */

  describe('权限验证', () => {
    describe('requireAuth', () => {
      let receivedSession: unknown = null;
      const captureAuthSession = (_req: NextRequest, _ctx: unknown, session: unknown) => {
        receivedSession = session;
        return NextResponse.json({ ok: true });
      };

      test('未登录时返回 401', async () => {
        vi.mocked(getSession).mockResolvedValue(null);
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test', requireAuth: true },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(401);

        const body = await readJson(res);
        expect(body.error).toBe('未登录');
      });

      test('已登录时正常放行', async () => {
        vi.mocked(getSession).mockResolvedValue({
          uid: 'u1',
          email: 'a@b.com',
          role: 'user',
        });
        const req = makeRequest('GET');
        receivedSession = null;
        const handler = apiHandler(
          'GET',
          { label: 'test', requireAuth: true },
          captureAuthSession,
        );

        const res = await handler(req);
        expect(res.status).toBe(200);
        expect(receivedSession).toMatchObject({ uid: 'u1' });
      });
    });

    describe('requireAdmin', () => {
      test('未登录时返回 401', async () => {
        vi.mocked(getSession).mockResolvedValue(null);
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test', requireAdmin: true },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(401);
      });

      test('普通用户返回 403', async () => {
        vi.mocked(getSession).mockResolvedValue({
          uid: 'u1',
          email: 'a@b.com',
          role: 'user',
        });
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test', requireAdmin: true },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(403);

        const body = await readJson(res);
        expect(body.error).toBe('无权限访问');
      });

      test('admin 角色正常放行', async () => {
        vi.mocked(getSession).mockResolvedValue({
          uid: 'u1',
          email: 'a@b.com',
          role: 'admin',
        });
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test', requireAdmin: true },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(200);
      });

      test('sudo 角色正常放行', async () => {
        vi.mocked(getSession).mockResolvedValue({
          uid: 'u1',
          email: 'a@b.com',
          role: 'sudo',
        });
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test', requireAdmin: true },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(200);
      });
    });

    describe('requireSudo', () => {
      let receivedSession: unknown = null;
      const captureSudoSession = (_req: NextRequest, _ctx: unknown, session: unknown) => {
        receivedSession = session;
        return NextResponse.json({ ok: true });
      };

      test('requireSudo 返回 NextResponse 时透传错误', async () => {
        const errorRes = NextResponse.json({ error: 'sudo 验证失败' }, { status: 403 });
        vi.mocked(requireSudo).mockResolvedValue(errorRes);
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test', requireSudo: true },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(403);
      });

      test('requireSudo 返回 session 时放行', async () => {
        vi.mocked(requireSudo).mockResolvedValue({
          uid: 'sudo1',
          email: 's@b.com',
          role: 'sudo',
        });
        const req = makeRequest('GET');
        receivedSession = null;
        const handler = apiHandler(
          'GET',
          { label: 'test', requireSudo: true },
          captureSudoSession,
        );

        const res = await handler(req);
        expect(res.status).toBe(200);
        expect(receivedSession).toMatchObject({ uid: 'sudo1' });
      });
    });

    describe('无认证要求', () => {
      test('默认不校验登录，直接放行', async () => {
        vi.mocked(getSession).mockResolvedValue(null);
        const req = makeRequest('GET');
        const handler = apiHandler(
          'GET',
          { label: 'test' },
          okHandler,
        );

        const res = await handler(req);
        expect(res.status).toBe(200);
        expect(getSession).not.toHaveBeenCalled();
      });
    });
  });

  /* ---------- 数据库校验 ---------- */

  describe('数据库校验 (requireDb)', () => {
    test('requireDb=true 且数据库可用时正常放行', async () => {
      vi.doMock('@/lib/db', () => ({
        getDb: vi.fn().mockReturnValue({ prisma: {} }),
      }));
      const { apiHandler: handlerFn } = await import('@/lib/api-handler');
      const req = makeRequest('GET');
      const handler = handlerFn(
        'GET',
        { label: 'test', requireDb: true },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      expect(res.status).toBe(200);
      vi.doUnmock('@/lib/db');
    });

    test('requireDb=true 且 prisma 不存在时返回 503', async () => {
      vi.doMock('@/lib/db', () => ({
        getDb: vi.fn().mockReturnValue({ prisma: null }),
      }));
      const { apiHandler: handlerFn } = await import('@/lib/api-handler');
      const req = makeRequest('GET');
      const handler = handlerFn(
        'GET',
        { label: 'test', requireDb: true },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      expect(res.status).toBe(503);

      const body = await readJson(res);
      expect(body.error).toBe('数据库未配置');
      vi.doUnmock('@/lib/db');
    });

    test('requireDb=false 时不检查数据库', async () => {
      const req = makeRequest('GET');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      expect(res.status).toBe(200);
    });
  });

  /* ---------- 异常处理 ---------- */

  describe('handler 异常处理', () => {
    test('JSON 解析错误返回 400', async () => {
      // 手动构造一个会触发 SyntaxError JSON 的请求
      const brokenReq = new NextRequest(
        new URL('/api/test', 'http://localhost'),
        {
          method: 'POST',
          body: 'invalid json{{{',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const handler = apiHandler(
        'POST',
        { label: 'test' },
        async (request) => {
          // 手动触发 JSON 解析错误
          await request.json();
          return NextResponse.json({ ok: true });
        },
      );

      const res = await handler(brokenReq);
      expect(res.status).toBe(400);

      const body = await readJson(res);
      expect(body.error).toBe('请求体格式错误');
    });

    test('普通 Error 返回 500', async () => {
      const req = makeRequest('GET');
      const handler = apiHandler(
        'GET',
        { label: '测试功能' },
        () => {
          throw new Error('数据库连接超时');
        },
      );

      const res = await handler(req);
      expect(res.status).toBe(500);

      const body = await readJson(res);
      expect(body.error).toBe('测试功能 失败');
    });

    test('非 Error 类型异常也返回 500', async () => {
      const req = makeRequest('GET');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => {
          // eslint-disable-next-line no-throw-literal
          throw 'string error';
        },
      );

      const res = await handler(req);
      expect(res.status).toBe(500);

      const body = await readJson(res);
      expect(body.error).toBe('test 失败');
    });
  });

  /* ---------- Cache-Control 头 ---------- */

  describe('Cache-Control 头设置', () => {
    test('写方法(GET/HEAD 以外)自动设置 no-store', async () => {
      for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
        const req = makeRequest(method);
        const handler = apiHandler(
          method,
          { label: 'test' },
          () => NextResponse.json({ ok: true }),
        );

        const res = await handler(req);
        expect(res.headers.get('Cache-Control')).toBe('private, no-store');
      }
    });

    test('GET 方法不设置 Cache-Control', async () => {
      const req = makeRequest('GET');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      // handler 返回的响应本身没有 Cache-Control
      expect(res.headers.get('Cache-Control')).toBeNull();
    });

    test('HEAD 方法不设置 Cache-Control', async () => {
      const req = makeRequest('HEAD');
      const handler = apiHandler(
        'HEAD',
        { label: 'test' },
        () => new NextResponse(null, { status: 200 }),
      );

      const res = await handler(req);
      expect(res.headers.get('Cache-Control')).toBeNull();
    });

    test('405 响应也带 Cache-Control', async () => {
      const req = makeRequest('POST');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      const res = await handler(req);
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });

    test('异常响应也带 Cache-Control', async () => {
      const req = makeRequest('GET');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => {
          throw new Error('boom');
        },
      );

      const res = await handler(req);
      expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    });
  });

  /* ---------- 性能指标 ---------- */

  describe('性能指标记录', () => {
    test('每次调用都记录一条指标', async () => {
      const before = getMetricsSnapshot().length;

      const req = makeRequest('GET', '/api/metrics-test');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      await handler(req);

      const after = getMetricsSnapshot().length;
      expect(after).toBe(before + 1);

      const latest = getMetricsSnapshot()[after - 1]!;
      expect(latest.route).toBe('/api/metrics-test');
      expect(latest.method).toBe('GET');
      expect(latest.statusCode).toBe(200);
      expect(latest.latencyMs).toBeGreaterThanOrEqual(0);
      expect(latest.timestamp).toBeGreaterThan(0);
    });

    test('异常时记录 500 状态码', async () => {
      const req = makeRequest('GET', '/api/error-route');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => {
          throw new Error('fail');
        },
      );

      await handler(req);

      const snapshot = getMetricsSnapshot();
      const latest = snapshot[snapshot.length - 1]!;
      expect(latest.statusCode).toBe(500);
      expect(latest.route).toBe('/api/error-route');
    });

    test('方法不匹配时 405 提前返回，不进入指标追踪', async () => {
      const before = getMetricsSnapshot().length;
      const req = makeRequest('POST', '/api/method-test');
      const handler = apiHandler(
        'GET',
        { label: 'test' },
        () => NextResponse.json({ ok: true }),
      );

      await handler(req);

      // 405 在性能追踪初始化之前就返回了，不记录指标
      const after = getMetricsSnapshot().length;
      expect(after).toBe(before);
    });
  });

  /* ---------- getParam ---------- */

  describe('getParam', () => {
    test('普通字符串参数', async () => {
      const ctx = { params: Promise.resolve({ id: 'abc' }) };
      const result = await getParam(ctx, 'id');
      expect(result).toBe('abc');
    });

    test('catch-all 数组参数拼接', async () => {
      const ctx = { params: Promise.resolve({ id: ['a', 'b', 'c'] }) };
      const result = await getParam(ctx, 'id');
      expect(result).toBe('a/b/c');
    });

    test('参数不存在时返回空字符串', async () => {
      const ctx: { params: Promise<Record<string, string>> } = { params: Promise.resolve({}) };
      const result = await getParam(ctx, 'id');
      expect(result).toBe('');
    });

    test('context 为 undefined 时返回空字符串', async () => {
      const result = await getParam(undefined, 'id');
      expect(result).toBe('');
    });

    test('参数值为普通字符串', async () => {
      const ctx = { params: Promise.resolve({ slug: 'hello-world' }) };
      const result = await getParam(ctx, 'slug');
      expect(result).toBe('hello-world');
    });
  });

});
