/**
 * app/files/[...path]/route.ts GET 处理器单元测试
 *
 * 覆盖范围:
 * - 路径非法 → 400
 * - WebDAV 未配置 → 503
 * - ACL 拒绝 → 401/404
 * - stat 异常 → 500
 * - stat 目录 → 404
 * - _debug 模式 → JSON
 * - httpsGet 成功 → 200 + 文件体 + 正确 headers
 * - httpsGet 上游 4xx/5xx → 透传
 * - httpsGet 网络错误 → 500
 * - 路径特殊字符 URL 编码
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FileStat, ResponseDataDetailed } from 'webdav';
import type { NextRequest } from 'next/server';
import { EventEmitter } from 'node:events';

// ─── mock 依赖 ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const _stat = vi.fn<() => Promise<FileStat | ResponseDataDetailed<FileStat>>>();
  const _getSession = vi.fn<() => Promise<unknown>>();
  const _checkAccess = vi.fn<() => Promise<{ allowed: boolean; reason?: string }>>();
  const _isWebDavConfigured = vi.fn<() => boolean>();
  const _httpsGet = vi.fn();
  return { getWebDavClient: vi.fn(() => ({ stat: _stat })), _stat, _getSession, _checkAccess, _isWebDavConfigured, _httpsGet };
});

vi.mock('@/lib/webdav', () => ({
  getWebDavClient: () => mocks.getWebDavClient(),
  isWebDavConfigured: () => mocks._isWebDavConfigured(),
}));
vi.mock('@/lib/auth', () => ({ getSession: () => mocks._getSession() }));
vi.mock('@/lib/storage/acl', () => ({ checkAccess: () => mocks._checkAccess() }));
vi.mock('node:https', () => ({
  default: { get: (url: string, opts: unknown, cb: (res: unknown) => void) => mocks._httpsGet(url, opts, cb) },
}));

// ─── helpers ────────────────────────────────────────────────────────────

function makeStat(overrides: Partial<FileStat> = {}): FileStat {
  return { filename: '/f', basename: 'f', type: 'file', size: 100, lastmod: '2025-01-01', mime: 'text/plain', etag: null, ...overrides };
}
function makeParams(path: string[]) { return { params: Promise.resolve({ path }) }; }

function makeMockReq(): EventEmitter & { setTimeout: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } {
  const req = new EventEmitter() as ReturnType<typeof makeMockReq>;
  req.setTimeout = vi.fn();
  req.destroy = vi.fn();
  return req;
}
function mockHttpsOk(body: string, statusCode = 200) {
  mocks._httpsGet.mockImplementation((_url: string, _opts: unknown, cb: (res: unknown) => void) => {
    const res = new EventEmitter();
    (res as unknown as { statusCode: number }).statusCode = statusCode;
    cb(res);
    process.nextTick(() => { res.emit('data', Buffer.from(body)); res.emit('end'); });
    return makeMockReq();
  });
}
function mockHttpsError(message: string) {
  mocks._httpsGet.mockImplementation(() => {
    const req = makeMockReq();
    process.nextTick(() => req.emit('error', new Error(message)));
    return req;
  });
}
function mockHttpsStatus(statusCode: number) {
  mocks._httpsGet.mockImplementation((_url: string, _opts: unknown, cb: (res: unknown) => void) => {
    const res = new EventEmitter();
    (res as unknown as { statusCode: number }).statusCode = statusCode;
    cb(res);
    process.nextTick(() => { res.emit('data', Buffer.from('')); res.emit('end'); });
    return makeMockReq();
  });
}

async function callGet(path: string[], url?: string) {
  const { GET } = await import('@/app/files/[...path]/route');
  const u = url ?? 'http://localhost/files/' + path.join('/');
  const req = { url: u } as unknown as NextRequest;
  const res = await GET(req, makeParams(path));
  return { status: res.status, body: await res.text(), headers: Object.fromEntries(res.headers.entries()) };
}
function j(body: string, status: number): Record<string, unknown> { try { return JSON.parse(body); } catch { throw new Error(`not json (${status}): ${body.slice(0, 100)}`); } }

// ─── 前置 ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mocks._stat.mockReset(); mocks._getSession.mockReset(); mocks._checkAccess.mockReset();
  mocks._isWebDavConfigured.mockReset(); mocks._httpsGet.mockReset();
  mocks._isWebDavConfigured.mockReturnValue(true);
  mocks._getSession.mockResolvedValue(null);
  mocks._checkAccess.mockResolvedValue({ allowed: true });
  mocks._stat.mockResolvedValue(makeStat());
  mockHttpsOk('ok');
  process.env.WEBDAV_URL = 'https://app.koofr.net/dav/Koofr/Pages';
  process.env.WEBDAV_USER = 'u'; process.env.WEBDAV_PASS = 'p';
});
afterEach(() => { vi.resetModules(); });

// ─── 输入校验 ────────────────────────────────────────────────────────────

describe('输入校验', () => {
  it('空路径 → 400', async () => { const r = await callGet(['']); expect(r.status).toBe(400); expect(j(r.body, r.status)).toHaveProperty('error', '路径非法'); });
  it('".." 路径 → 400', async () => { const r = await callGet(['a', '..', 'b']); expect(r.status).toBe(400); });
});

// ─── 前置条件 ────────────────────────────────────────────────────────────

describe('前置条件', () => {
  it('WebDAV 未配置 → 503', async () => { mocks._isWebDavConfigured.mockReturnValue(false); const r = await callGet(['x']); expect(r.status).toBe(503); expect(j(r.body, r.status)).toHaveProperty('code', 'NOT_CONFIGURED'); });
  it('ACL 拒绝 → 401', async () => { mocks._checkAccess.mockResolvedValue({ allowed: false }); const r = await callGet(['x']); expect(r.status).toBe(401); });
  it('ACL not-found → 404', async () => { mocks._checkAccess.mockResolvedValue({ allowed: false, reason: 'not-found' }); const r = await callGet(['x']); expect(r.status).toBe(404); });
});

// ─── stat ────────────────────────────────────────────────────────────────

describe('stat', () => {
  it('stat 抛错 → 500', async () => { mocks._stat.mockRejectedValue(new Error('conn refused')); const r = await callGet(['x']); expect(r.status).toBe(500); expect(j(r.body, r.status).error).toContain('conn refused'); });
  it('stat 目录 → 404', async () => { mocks._stat.mockResolvedValue(makeStat({ type: 'directory' })); const r = await callGet(['x']); expect(r.status).toBe(404); });
});

// ─── debug ───────────────────────────────────────────────────────────────

describe('debug', () => {
  it('_debug=1 → JSON', async () => {
    const r = await callGet(['p', 'f.html'], 'http://localhost/files/p/f.html?_debug=1');
    expect(r.status).toBe(200);
    expect(j(r.body, r.status)).toHaveProperty('relativePath', 'p/f.html');
  });
});

// ─── httpsGet URL + 认证 ─────────────────────────────────────────────────

describe('httpsGet URL 编码', () => {
  it('路径含空格 → %20', async () => {
    await callGet(['Hello World', 'index.html']);
    const [url] = mocks._httpsGet.mock.calls[0] as [string];
    expect(url).toBe('https://app.koofr.net/dav/Koofr/Pages/Hello%20World/index.html');
  });
  it('路径含特殊字符 → 正确编码', async () => {
    await callGet(['中文', '测#.html']);
    const [url] = mocks._httpsGet.mock.calls[0] as [string];
    expect(url).toContain(encodeURIComponent('中文'));
    expect(url).toContain(encodeURIComponent('测#.html'));
  });
  it('Authorization 是 Basic', async () => {
    await callGet(['p', 'f.html']);
    const [, opts] = mocks._httpsGet.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(opts.headers.Authorization).toMatch(/^Basic /);
  });
});

// ─── httpsGet 成功 ──────────────────────────────────────────────────────

describe('httpsGet 成功', () => {
  it('200 + 文件体 + headers', async () => {
    mocks._stat.mockResolvedValue(makeStat({ mime: 'text/html', size: 763 }));
    mockHttpsOk('<h1>Hello</h1>');
    const r = await callGet(['p', 'hello.html']);
    expect(r.status).toBe(200);
    expect(r.body).toBe('<h1>Hello</h1>');
    expect(r.headers['content-type']).toContain('text/html');
    expect(r.headers['content-length']).toBe('763');
  });
  it('Cache-Control + X-Content-Type-Options', async () => {
    const r = await callGet(['p', 'f.png']);
    expect(r.headers['cache-control']).toBe('private, max-age=3600');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
  });
  it('text/html → attachment', async () => { mocks._stat.mockResolvedValue(makeStat({ mime: 'text/html' })); const r = await callGet(['p']); expect(r.headers['content-disposition']).toBe('attachment'); });
  it('image/png → inline', async () => { mocks._stat.mockResolvedValue(makeStat({ mime: 'image/png' })); const r = await callGet(['p']); expect(r.headers['content-disposition']).toBe('inline'); });
});

// ─── httpsGet 失败 ──────────────────────────────────────────────────────

describe('httpsGet 失败', () => {
  it('上游 404 → 透传', async () => { mockHttpsStatus(404); const r = await callGet(['p']); expect(r.status).toBe(404); expect(j(r.body, r.status)).toHaveProperty('error', '上游 404'); });
  it('上游 502 → 透传', async () => { mockHttpsStatus(502); const r = await callGet(['p']); expect(r.status).toBe(502); });
  it('网络错误 → 500', async () => { mockHttpsError('ECONNREFUSED'); const r = await callGet(['p']); expect(r.status).toBe(500); expect(j(r.body, r.status).error).toContain('ECONNREFUSED'); });
});

// ─── catch-all ──────────────────────────────────────────────────────────

describe('catch-all', () => {
  it('params reject → 500', async () => {
    const { GET } = await import('@/app/files/[...path]/route');
    const req = { url: 'http://localhost/files/x' } as unknown as NextRequest;
    const res = await GET(req, { params: Promise.reject(new Error('boom')) });
    expect(res.status).toBe(500);
  });
});
