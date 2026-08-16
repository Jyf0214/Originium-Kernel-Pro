/**
 * articles GET 列表行为测试
 *
 * 覆盖范围:
 * - 未认证时仅返回已发布文章（草稿/回收站不可见）
 * - Cookie 登录后可见自己的草稿与回收站文章
 * - 非 admin 不可见他人草稿/回收站文章
 * - API 密钥无 posts_read 权限时拒绝访问
 * - API 密钥有权限时注入会话
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/* ---------- mock 模块 ---------- */

// KV 平面存储，模拟 lib/db 的 hash 行为
const kvStore = new Map<string, string>();

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    get: (k: string) => kvStore.get(k) ?? null,
    set: (k: string, v: string) => { kvStore.set(k, v); },
    del: (k: string) => { kvStore.delete(k); },
    hget: (k: string, f: string) => kvStore.get(`${k}:${f}`) ?? null,
    hset: (k: string, f: string, v: string) => { kvStore.set(`${k}:${f}`, v); },
    hdel: (k: string, f: string) => { kvStore.delete(`${k}:${f}`); },
    hgetall: (k: string) => {
      const result: Record<string, string> = {};
      for (const [key, value] of kvStore) {
        if (key.startsWith(`${k}:`)) {
          result[key.slice(k.length + 1)] = value;
        }
      }
      return result;
    },
    prisma: null,
  })),
}));

const publishedPosts = [
  {
    slug: '/public/post-1',
    meta: { title: '公开文章', date: '2024-01-01', author: 'Admin', tags: [] },
    content: '内容',
    raw: '',
  },
];

vi.mock('@/lib/content-access', () => ({
  getAccessibleContent: vi.fn(() => ({ files: publishedPosts })),
}));

vi.mock('@/lib/config', () => ({
  getUserAvatar: vi.fn(() => null),
}));

vi.mock('@/lib/draft-storage', () => ({
  getDraft: vi.fn(() => '草稿内容'),
  saveDraft: vi.fn(),
}));

vi.mock('@/lib/api-logger', () => ({
  createApiLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock('@/lib/github', () => ({
  updateFileInGithub: vi.fn(),
  composeFileContent: vi.fn(() => ''),
}));

vi.mock('@/lib/env', () => ({
  getEnvConfig: vi.fn(() => ({ githubRepo: '', githubToken: '' })),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}));

// 可配置的认证 mock
const authState = {
  sessionWithKeyId: null as { session: { uid: string; role: string; email: string }; currentKeyId: string | null } | null,
  permissionDenied: null as { status: number } | null,
};

vi.mock('@/lib/auth', () => ({
  isRootRole: vi.fn((role: string) => role === 'root'),
  getSessionWithKeyId: vi.fn(() => authState.sessionWithKeyId),
  requireApiKeyPermission: vi.fn(() => authState.permissionDenied),
}));

// 延迟 import，确保 mock 先注册
import { GET } from '../src/app/api/articles/route';

function jsonResponse(res: Response) {
  return res.json();
}

beforeEach(() => {
  kvStore.clear();
  authState.sessionWithKeyId = null;
  authState.permissionDenied = null;
});

describe('GET /api/articles', () => {
  test('未认证时仅返回已发布文章', async () => {
    // 预置草稿与回收站数据（未认证时应不可见）
    kvStore.set('articles:drafts:d1', JSON.stringify({ id: 'd1', authorId: 'u1', title: '草稿', status: 'draft' }));
    kvStore.set('articles:index:r1', JSON.stringify({ id: 'r1', authorId: 'u1', title: '回收站文章', status: 'pending_deletion' }));

    const res = await GET(new NextRequest('http://localhost/api/articles'));
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    expect(body).toHaveLength(1);
    expect(body[0].slug).toBe('/public/post-1');
    expect(body[0].status).toBe('published');
  });

  test('Cookie 登录后可见自己的草稿与回收站文章', async () => {
    authState.sessionWithKeyId = { session: { uid: 'u1', role: 'user', email: 'u1@test.com' }, currentKeyId: null };
    kvStore.set('articles:drafts:d1', JSON.stringify({ id: 'd1', authorId: 'u1', title: '我的草稿', status: 'draft', date: '2024-01-02' }));
    kvStore.set('articles:index:r1', JSON.stringify({ id: 'r1', authorId: 'u1', title: '我的回收站文章', status: 'pending_deletion', date: '2024-01-03' }));

    const res = await GET(new NextRequest('http://localhost/api/articles'));
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    const statuses = body.map((a: { status: string }) => a.status).sort();
    expect(statuses).toEqual(['draft', 'pending_deletion', 'published']);
    expect(body.find((a: { id: string }) => a.id === 'd1').title).toBe('我的草稿');
    expect(body.find((a: { id: string }) => a.id === 'r1').title).toBe('我的回收站文章');
  });

  test('非 admin 看不到他人的草稿与回收站文章', async () => {
    authState.sessionWithKeyId = { session: { uid: 'u2', role: 'user', email: 'u2@test.com' }, currentKeyId: null };
    kvStore.set('articles:drafts:d1', JSON.stringify({ id: 'd1', authorId: 'u1', title: '他人草稿', status: 'draft' }));
    kvStore.set('articles:index:r1', JSON.stringify({ id: 'r1', authorId: 'u1', title: '他人回收站文章', status: 'pending_deletion' }));

    const res = await GET(new NextRequest('http://localhost/api/articles'));
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    expect(body).toHaveLength(1);
  });

  test('admin 可见所有用户的草稿与回收站文章', async () => {
    authState.sessionWithKeyId = { session: { uid: 'admin1', role: 'admin', email: 'admin@test.com' }, currentKeyId: null };
    kvStore.set('articles:drafts:d1', JSON.stringify({ id: 'd1', authorId: 'u1', title: '他人草稿', status: 'draft', date: '2024-01-02' }));
    kvStore.set('articles:index:r1', JSON.stringify({ id: 'r1', authorId: 'u1', title: '他人回收站文章', status: 'pending_deletion', date: '2024-01-03' }));

    const res = await GET(new NextRequest('http://localhost/api/articles'));
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    expect(body).toHaveLength(3);
  });

  test('API 密钥无 posts_read 权限时拒绝访问', async () => {
    authState.sessionWithKeyId = { session: { uid: 'u1', role: 'user', email: 'u1@test.com' }, currentKeyId: 'k1' };
    authState.permissionDenied = { status: 403 };

    const res = await GET(new NextRequest('http://localhost/api/articles'));
    expect(res.status).toBe(403);
  });

  test('API 密钥有 posts_read 权限时注入会话并返回草稿', async () => {
    authState.sessionWithKeyId = { session: { uid: 'u1', role: 'user', email: 'u1@test.com' }, currentKeyId: 'k1' };
    kvStore.set('articles:drafts:d1', JSON.stringify({ id: 'd1', authorId: 'u1', title: '密钥访问草稿', status: 'draft', date: '2024-01-02' }));

    const res = await GET(new NextRequest('http://localhost/api/articles'));
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    expect(body.find((a: { id: string }) => a.id === 'd1')).toBeDefined();
  });
});