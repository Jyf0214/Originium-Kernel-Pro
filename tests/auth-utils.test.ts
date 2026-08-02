/**
 * auth.ts 工具函数单元测试
 *
 * 覆盖范围:
 * - generateUID 格式与唯一性
 * - generateApiKey 格式与唯一性
 * - hashApiKey HMAC-SHA256 输出
 * - validatePasswordStrength 各种密码强度
 * - requireApiKeyPermission Cookie/API密钥/权限放行与拒绝
 */

import { describe, it, expect, vi } from 'vitest';
import type { PermissionAction } from '@/lib/api-key-permissions';

// Mock @/lib/db — 测试不需要真实数据库连接
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    prisma: null,
  })),
  hasDatabase: vi.fn(() => false),
}));

describe('generateUID', () => {
  it('应返回 UID- 开头的字符串', async () => {
    const { generateUID } = await import('@/lib/auth');
    const uid = generateUID();
    expect(uid).toMatch(/^UID-/);
  });

  it('每次生成的 UID 应不同', async () => {
    const { generateUID } = await import('@/lib/auth');
    const a = generateUID();
    const b = generateUID();
    expect(a).not.toBe(b);
  });

  it('UID 格式应为 UID-<时间戳36进制>-<随机5字符>', async () => {
    const { generateUID } = await import('@/lib/auth');
    const uid = generateUID();
    const parts = uid.split('-');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('UID');
    expect(parts[1]?.length).toBeGreaterThan(0);
    expect(parts[2]?.length).toBe(5);
  });
});

describe('generateApiKey', () => {
  it('应返回 sk- 开头的字符串', async () => {
    const { generateApiKey } = await import('@/lib/auth');
    const key = generateApiKey();
    expect(key).toMatch(/^sk-/);
  });

  it('每次生成的密钥应不同', async () => {
    const { generateApiKey } = await import('@/lib/auth');
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).not.toBe(b);
  });
});

describe('hashApiKey', () => {
  it('应返回 64 字符的 hex 字符串', async () => {
    const { hashApiKey } = await import('@/lib/auth');
    const hash = hashApiKey('sk-test-key-123');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('相同输入应产生相同输出', async () => {
    const { hashApiKey } = await import('@/lib/auth');
    const a = hashApiKey('sk-abc');
    const b = hashApiKey('sk-abc');
    expect(a).toBe(b);
  });

  it('不同输入应产生不同输出', async () => {
    const { hashApiKey } = await import('@/lib/auth');
    const a = hashApiKey('sk-abc');
    const b = hashApiKey('sk-def');
    expect(a).not.toBe(b);
  });
});

describe('validatePasswordStrength', () => {
  it('强密码应通过验证', async () => {
    const { validatePasswordStrength } = await import('@/lib/auth');
    expect(validatePasswordStrength('StrongPass1')).toEqual({ valid: true });
  });

  it('短密码应返回 reasons', async () => {
    const { validatePasswordStrength } = await import('@/lib/auth');
    const result = validatePasswordStrength('Ab1');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes('长度'))).toBe(true);
    }
  });

  it('缺少大写字母应返回 reasons', async () => {
    const { validatePasswordStrength } = await import('@/lib/auth');
    const result = validatePasswordStrength('lowercase1');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.some((r) => r.includes('大写'))).toBe(true);
    }
  });

  it('缺少小写字母应返回 reasons', async () => {
    const { validatePasswordStrength } = await import('@/lib/auth');
    const result = validatePasswordStrength('UPPERCASE1');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.some((r) => r.includes('小写'))).toBe(true);
    }
  });

  it('缺少数字应返回 reasons', async () => {
    const { validatePasswordStrength } = await import('@/lib/auth');
    const result = validatePasswordStrength('NoDigitsHere');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.some((r) => r.includes('数字'))).toBe(true);
    }
  });

  it('完全弱密码应返回多个 reasons', async () => {
    const { validatePasswordStrength } = await import('@/lib/auth');
    const result = validatePasswordStrength('1');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('requireApiKeyPermission', () => {
  it('Cookie 认证（keyId=null）应放行', async () => {
    const { requireApiKeyPermission } = await import('@/lib/auth');
    const session = { uid: 'U1', email: 'a@b.com', role: 'user' as const };
    expect(requireApiKeyPermission(session, null, 'posts_read')).toBeNull();
  });

  it('无 permissions 配置应放行', async () => {
    const { requireApiKeyPermission } = await import('@/lib/auth');
    const session = { uid: 'U1', email: 'a@b.com', role: 'user' as const };
    expect(requireApiKeyPermission(session, 'key-1', 'posts_read')).toBeNull();
  });

  it('有 permissions 且允许操作应放行', async () => {
    const { requireApiKeyPermission } = await import('@/lib/auth');
    const session = {
      uid: 'U1', email: 'a@b.com', role: 'user' as const,
      permissions: { actions: { posts_read: true } as Record<PermissionAction, boolean> },
    };
    expect(requireApiKeyPermission(session, 'key-1', 'posts_read')).toBeNull();
  });

  it('有 permissions 且拒绝操作应返回 403', async () => {
    const { requireApiKeyPermission } = await import('@/lib/auth');
    const session = {
      uid: 'U1', email: 'a@b.com', role: 'user' as const,
      permissions: { actions: { posts_read: true } as Record<PermissionAction, boolean> },
    };
    const result = requireApiKeyPermission(session, 'key-1', 'posts_write');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
