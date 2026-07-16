/**
 * api-key-permissions.ts 单元测试
 *
 * 覆盖范围:
 * - PERMISSION_GROUPS 常量结构与完整性
 * - DEFAULT_PERMISSIONS 全部为 true
 * - EMPTY_PERMISSIONS 全部为 false
 * - parsePermissions: null/undefined、无效 JSON、缺少 actions、有效 JSON
 * - hasPermission: Cookie 认证、无权限配置、有权限配置
 * - serializePermissions: 序列化往返
 */

import { describe, test, expect } from 'vitest';
import {
  PERMISSION_GROUPS,
  DEFAULT_PERMISSIONS,
  EMPTY_PERMISSIONS,
  parsePermissions,
  hasPermission,
  serializePermissions,
} from '@/lib/api-key-permissions';
import type {
  ApiKeyPermissions,
  PermissionAction,
} from '@/lib/api-key-permissions';
import type { SessionPayload } from '@/lib/auth';

/* ---------- 常量: PERMISSION_GROUPS ---------- */

describe('PERMISSION_GROUPS', () => {
  test('非空数组', () => {
    expect(Array.isArray(PERMISSION_GROUPS)).toBe(true);
    expect(PERMISSION_GROUPS.length).toBeGreaterThan(0);
  });

  test('每个分组包含 label 和 actions 数组', () => {
    for (const group of PERMISSION_GROUPS) {
      expect(typeof group.label).toBe('string');
      expect(group.label.length).toBeGreaterThan(0);
      expect(Array.isArray(group.actions)).toBe(true);
      expect(group.actions.length).toBeGreaterThan(0);
    }
  });

  test('每个 action 包含 key 和 label', () => {
    for (const group of PERMISSION_GROUPS) {
      for (const action of group.actions) {
        expect(typeof action.key).toBe('string');
        expect(typeof action.label).toBe('string');
        expect(action.key.length).toBeGreaterThan(0);
        expect(action.label.length).toBeGreaterThan(0);
      }
    }
  });

  test('所有 action key 唯一（无重复）', () => {
    const keys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('包含文章相关权限', () => {
    const keys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(keys).toContain('posts_read');
    expect(keys).toContain('posts_write');
    expect(keys).toContain('posts_delete');
  });

  test('包含媒体文件权限', () => {
    const keys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(keys).toContain('media_read');
    expect(keys).toContain('media_write');
    expect(keys).toContain('media_delete');
  });

  test('包含文件存储权限', () => {
    const keys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(keys).toContain('storage_read');
    expect(keys).toContain('storage_write');
    expect(keys).toContain('storage_delete');
  });

  test('包含站点设置权限', () => {
    const keys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(keys).toContain('settings_read');
    expect(keys).toContain('settings_write');
  });

  test('包含统计与搜索权限', () => {
    const keys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(keys).toContain('stats_read');
    expect(keys).toContain('search');
  });
});

/* ---------- 常量: DEFAULT_PERMISSIONS ---------- */

describe('DEFAULT_PERMISSIONS', () => {
  test('actions 中所有键的值均为 true', () => {
    const allKeys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(Object.keys(DEFAULT_PERMISSIONS.actions)).toHaveLength(allKeys.length);
    for (const key of allKeys) {
      expect(DEFAULT_PERMISSIONS.actions[key]).toBe(true);
    }
  });
});

/* ---------- 常量: EMPTY_PERMISSIONS ---------- */

describe('EMPTY_PERMISSIONS', () => {
  test('actions 中所有键的值均为 false', () => {
    const allKeys = PERMISSION_GROUPS.flatMap(g => g.actions.map(a => a.key));
    expect(Object.keys(EMPTY_PERMISSIONS.actions)).toHaveLength(allKeys.length);
    for (const key of allKeys) {
      expect(EMPTY_PERMISSIONS.actions[key]).toBe(false);
    }
  });
});

/* ---------- parsePermissions ---------- */

describe('parsePermissions', () => {
  test('null 输入返回 null', () => {
    expect(parsePermissions(null)).toBeNull();
  });

  test('undefined 输入返回 null', () => {
    expect(parsePermissions(undefined)).toBeNull();
  });

  test('空字符串返回 null', () => {
    expect(parsePermissions('')).toBeNull();
  });

  test('无效 JSON 字符串返回 EMPTY_PERMISSIONS', () => {
    const result = parsePermissions('{invalid json');
    expect(result).toEqual(EMPTY_PERMISSIONS);
  });

  test('有效 JSON 但无 actions 字段返回 EMPTY_PERMISSIONS', () => {
    const result = parsePermissions('{"foo":"bar"}');
    expect(result).toEqual(EMPTY_PERMISSIONS);
  });

  test('有效 JSON 但 actions 非对象返回 EMPTY_PERMISSIONS', () => {
    const result = parsePermissions('{"actions": "string"}');
    expect(result).toEqual(EMPTY_PERMISSIONS);
  });

  test('有效 JSON 且包含 actions 返回解析对象', () => {
    const input = JSON.stringify({
      actions: { posts_read: true, posts_write: false },
    });
    const result = parsePermissions(input);
    expect(result).not.toBeNull();
    expect(result!.actions.posts_read).toBe(true);
    expect(result!.actions.posts_write).toBe(false);
  });

  test('仅包含 actions 的有效 JSON 也能正确解析', () => {
    const input = JSON.stringify({
      actions: { stats_read: true },
    });
    const result = parsePermissions(input);
    expect(result).not.toBeNull();
    expect(result!.actions.stats_read).toBe(true);
  });
});

/* ---------- hasPermission ---------- */

describe('hasPermission', () => {
  const baseSession: SessionPayload = {
    uid: 'user-1',
    email: 'test@test.com',
    role: 'admin',
  };

  test('keyId 为 null（Cookie 认证）始终返回 true', () => {
    expect(hasPermission(baseSession, 'posts_read', null)).toBe(true);
    expect(hasPermission(baseSession, 'posts_delete', null)).toBe(true);
    expect(hasPermission(baseSession, 'settings_write', null)).toBe(true);
  });

  test('无 permissions 配置时返回 true（向后兼容）', () => {
    const session: SessionPayload = { ...baseSession };
    expect(hasPermission(session, 'posts_read', 'key-1')).toBe(true);
    expect(hasPermission(session, 'media_delete', 'key-1')).toBe(true);
  });

  test('有 permissions 且 action 为 true 时返回 true', () => {
    const session: SessionPayload = {
      ...baseSession,
      permissions: {
        actions: {
          posts_read: true,
          posts_write: false,
          posts_delete: false,
          media_read: false,
          media_write: false,
          media_delete: false,
          storage_read: false,
          storage_write: false,
          storage_delete: false,
          settings_read: false,
          settings_write: false,
          stats_read: false,
          search: false,
        },
      },
    };
    expect(hasPermission(session, 'posts_read', 'key-1')).toBe(true);
  });

  test('有 permissions 且 action 为 false 时返回 false', () => {
    const session: SessionPayload = {
      ...baseSession,
      permissions: {
        actions: {
          posts_read: true,
          posts_write: false,
          posts_delete: false,
          media_read: false,
          media_write: false,
          media_delete: false,
          storage_read: false,
          storage_write: false,
          storage_delete: false,
          settings_read: false,
          settings_write: false,
          stats_read: false,
          search: false,
        },
      },
    };
    expect(hasPermission(session, 'posts_write', 'key-1')).toBe(false);
    expect(hasPermission(session, 'posts_delete', 'key-1')).toBe(false);
  });

  test('权限对象中不存在的 action 返回 false', () => {
    const session: SessionPayload = {
      ...baseSession,
      permissions: {
        actions: {} as Record<PermissionAction, boolean>,
      },
    };
    expect(hasPermission(session, 'posts_read', 'key-1')).toBe(false);
  });
});

/* ---------- serializePermissions ---------- */

describe('serializePermissions', () => {
  test('序列化 DEFAULT_PERMISSIONS 并可反序列化', () => {
    const json = serializePermissions(DEFAULT_PERMISSIONS);
    const parsed = JSON.parse(json);
    expect(parsed.actions).toEqual(DEFAULT_PERMISSIONS.actions);
  });

  test('序列化 EMPTY_PERMISSIONS 并可反序列化', () => {
    const json = serializePermissions(EMPTY_PERMISSIONS);
    const parsed = JSON.parse(json);
    expect(parsed.actions).toEqual(EMPTY_PERMISSIONS.actions);
  });

  test('序列化自定义权限', () => {
    const custom: ApiKeyPermissions = {
      actions: {
        posts_read: true,
        posts_write: false,
        posts_delete: false,
        media_read: false,
        media_write: false,
        media_delete: false,
        storage_read: false,
        storage_write: false,
        storage_delete: false,
        settings_read: false,
        settings_write: false,
        stats_read: false,
        search: false,
      },
    };
    const json = serializePermissions(custom);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(custom);
  });

  test('输出是有效的 JSON 字符串', () => {
    const json = serializePermissions(DEFAULT_PERMISSIONS);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
