/**
 * API 密钥细粒度权限系统
 *
 * 设计原则:
 * - null/undefined 权限 = 全部权限(向后兼容旧密钥)
 * - Cookie 认证(浏览器)不受权限限制
 * - 仅 API 密钥认证时检查权限
 */
import type { SessionPayload } from '@/lib/auth';
import { getTranslate } from '@/i18n/translate';

/* ---------- 权限操作类型 ---------- */

/** 所有可授权的操作标识 */
export type PermissionAction =
  // 文章
  | 'posts_read' | 'posts_write' | 'posts_delete'
  // 媒体文件
  | 'media_read' | 'media_write' | 'media_delete'
  // 文件存储
  | 'storage_read' | 'storage_write' | 'storage_delete'
  // 站点设置
  | 'settings_read' | 'settings_write'
  // 统计
  | 'stats_read'
  // 搜索
  | 'search'
  // 审计日志
  | 'audit_read'
  // 用户管理
  | 'user_read' | 'user_write';

/** 操作权限分组(用于 UI 展示) */
export const PERMISSION_GROUPS: {
  label: string;
  actions: { key: PermissionAction; label: string }[];
}[] = [
  {
    label: getTranslate('lib.permissions.groupPosts'),
    actions: [
      { key: 'posts_read', label: getTranslate('lib.permissions.postsRead') },
      { key: 'posts_write', label: getTranslate('lib.permissions.postsWrite') },
      { key: 'posts_delete', label: getTranslate('lib.permissions.postsDelete') },
    ],
  },
  {
    label: getTranslate('lib.permissions.groupMedia'),
    actions: [
      { key: 'media_read', label: getTranslate('lib.permissions.mediaRead') },
      { key: 'media_write', label: getTranslate('lib.permissions.mediaWrite') },
      { key: 'media_delete', label: getTranslate('lib.permissions.mediaDelete') },
    ],
  },
  {
    label: getTranslate('lib.permissions.groupStorage'),
    actions: [
      { key: 'storage_read', label: getTranslate('lib.permissions.storageRead') },
      { key: 'storage_write', label: getTranslate('lib.permissions.storageWrite') },
      { key: 'storage_delete', label: getTranslate('lib.permissions.storageDelete') },
    ],
  },
  {
    label: getTranslate('lib.permissions.groupSettings'),
    actions: [
      { key: 'settings_read', label: getTranslate('lib.permissions.settingsRead') },
      { key: 'settings_write', label: getTranslate('lib.permissions.settingsWrite') },
    ],
  },
  {
    label: getTranslate('lib.permissions.groupStats'),
    actions: [
      { key: 'stats_read', label: getTranslate('lib.permissions.statsRead') },
      { key: 'search', label: getTranslate('lib.permissions.search') },
    ],
  },
  {
    label: getTranslate('lib.permissions.groupAudit'),
    actions: [
      { key: 'audit_read', label: getTranslate('lib.permissions.auditRead') },
    ],
  },
  {
    label: getTranslate('lib.permissions.groupUsers'),
    actions: [
      { key: 'user_read', label: getTranslate('lib.permissions.userRead') },
      { key: 'user_write', label: getTranslate('lib.permissions.userWrite') },
    ],
  },
];

/* ---------- 完整权限结构 ---------- */

export interface ApiKeyPermissions {
  /** 操作级别权限(key → 是否允许) */
  actions: Record<PermissionAction, boolean>;
}

/* ---------- 默认值 ---------- */

/** 全部权限(新密钥默认值 / 旧密钥兼容) */
function createAllActions(): Record<PermissionAction, boolean> {
  const actions = {} as Record<PermissionAction, boolean>;
  for (const group of PERMISSION_GROUPS) {
    for (const a of group.actions) {
      actions[a.key] = true;
    }
  }
  return actions;
}

export const DEFAULT_PERMISSIONS: ApiKeyPermissions = {
  actions: createAllActions(),
};

/** 空权限(全部禁止) */
function createEmptyActions(): Record<PermissionAction, boolean> {
  const actions = {} as Record<PermissionAction, boolean>;
  for (const group of PERMISSION_GROUPS) {
    for (const a of group.actions) {
      actions[a.key] = false;
    }
  }
  return actions;
}

export const EMPTY_PERMISSIONS: ApiKeyPermissions = {
  actions: createEmptyActions(),
};

/* ---------- 权限工具函数 ---------- */

/**
 * 从 JSON 字符串解析权限配置
 *
 * 语义区分:
 * - null/undefined 输入 → 返回 null（向后兼容:数据库中无权限字段视为全部权限）
 * - 非空字符串但解析/校验失败 → 返回 EMPTY_PERMISSIONS（全部禁止，防止损坏数据导致提权）
 * - 有效 JSON → 返回解析后的权限对象
 */
export function parsePermissions(raw: string | null | undefined): ApiKeyPermissions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // 基本结构校验
    if (!parsed.actions || typeof parsed.actions !== 'object') return EMPTY_PERMISSIONS;
    return parsed as unknown as ApiKeyPermissions;
  } catch {
    // JSON 解析失败(数据损坏) → 全部禁止，防止 fail-open 提权
    return EMPTY_PERMISSIONS;
  }
}

/**
 * 检查会话是否拥有指定操作权限
 *
 * 规则:
 * - Cookie 认证(keyId===null) → 始终通过
 * - API 密钥认证 + 无权限配置 → 全部通过(向后兼容)
 * - API 密钥认证 + 有权限配置 → 检查 actions[action]
 */
export function hasPermission(
  session: SessionPayload,
  action: PermissionAction,
  keyId: string | null,
): boolean {
  // Cookie 认证，不受限制
  if (keyId === null) return true;
  // 无权限配置，全部权限
  if (!session.permissions) return true;
  // 检查具体操作
  return !!session.permissions.actions[action];
}

/** 将权限对象序列化为 JSON 字符串 */
export function serializePermissions(permissions: ApiKeyPermissions): string {
  return JSON.stringify(permissions);
}
