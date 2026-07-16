/**
 * API 密钥细粒度权限系统
 *
 * 设计原则:
 * - null/undefined 权限 = 全部权限(向后兼容旧密钥)
 * - Cookie 认证(浏览器)不受权限限制
 * - 仅 API 密钥认证时检查权限
 */
import type { SessionPayload } from '@/lib/auth';

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
  | 'search';

/** 操作权限分组(用于 UI 展示) */
export const PERMISSION_GROUPS: {
  label: string;
  actions: { key: PermissionAction; label: string }[];
}[] = [
  {
    label: '文章',
    actions: [
      { key: 'posts_read', label: '查看文章' },
      { key: 'posts_write', label: '创建/编辑文章' },
      { key: 'posts_delete', label: '删除文章' },
    ],
  },
  {
    label: '媒体文件',
    actions: [
      { key: 'media_read', label: '查看媒体' },
      { key: 'media_write', label: '上传/编辑媒体' },
      { key: 'media_delete', label: '删除媒体' },
    ],
  },
  {
    label: '文件存储',
    actions: [
      { key: 'storage_read', label: '浏览文件' },
      { key: 'storage_write', label: '上传/创建文件' },
      { key: 'storage_delete', label: '删除文件' },
    ],
  },
  {
    label: '站点设置',
    actions: [
      { key: 'settings_read', label: '查看设置' },
      { key: 'settings_write', label: '修改设置' },
    ],
  },
  {
    label: '统计与搜索',
    actions: [
      { key: 'stats_read', label: '查看统计' },
      { key: 'search', label: '全站搜索' },
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
