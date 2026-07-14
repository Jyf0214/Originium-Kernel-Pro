import { describe, test, expect } from 'vitest';
import type { NextResponse } from 'next/server';
import { ApiErr } from '@/lib/api-handler';

async function readJson(res: NextResponse) {
  return res.json();
}

describe('ApiErr', () => {
  const cases: [string, () => NextResponse, number, string][] = [
    ['unauthorized 返回 401', () => ApiErr.unauthorized(), 401, '未登录'],
    ['forbidden 返回 403', () => ApiErr.forbidden(), 403, '无权限访问'],
    ['notFound 返回 404', () => ApiErr.notFound(), 404, '资源不存在'],
    ['badRequest 返回 400', () => ApiErr.badRequest(), 400, '请求参数错误'],
    ['serverError 返回 500', () => ApiErr.serverError(), 500, '服务器内部错误'],
  ];

  for (const [name, factory, status, msg] of cases) {
    test(name, async () => {
      const res = factory();
      expect(res.status).toBe(status);
      const body = await readJson(res);
      expect(body.error).toBe(msg);
    });
  }

  test('unauthorized 自定义消息', async () => {
    const res = ApiErr.unauthorized('自定义未登录');
    const body = await readJson(res);
    expect(body.error).toBe('自定义未登录');
  });

  test('structured 返回 400 并携带 code 和 details', async () => {
    const res = ApiErr.structured('出错了', 'ERR_CODE', { field: 'name' });
    expect(res.status).toBe(400);
    const body = await readJson(res);
    expect(body.error).toBe('出错了');
    expect(body.code).toBe('ERR_CODE');
    expect(body.details).toEqual({ field: 'name' });
  });

  test('structured 无 details 时不含 details 字段', async () => {
    const res = ApiErr.structured('出错了', 'ERR_CODE');
    const body = await readJson(res);
    expect(body).not.toHaveProperty('details');
  });
});
