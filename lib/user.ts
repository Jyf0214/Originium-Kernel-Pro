/**
 * 用户身份系统 — UID 管理（客户端封装）
 * Originium Kernel — 纯客户端逻辑
 */

export type UserRole = 'user' | 'admin' | 'sudo';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  userGroup?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'pending_deletion' | 'deleted';
  deletionRequestedAt?: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  memberCount: number;
}

/**
 * 根据 UID 获取用户资料
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const res = await fetch(`/api/users/${uid}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * 更新用户角色（仅超级管理员）
 */
export async function updateUserRole(
  uid: string, 
  newRole: UserRole,
  userGroup?: string
): Promise<void> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole, userGroup }),
  });
  if (!res.ok) throw new Error('更新角色失败');
}

/**
 * 获取所有用户（仅超级管理员）
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/users');
  if (!res.ok) return [];
  return res.json();
}

/**
 * 创建用户组（仅超级管理员）
 */
export async function createUserGroup(
  name: string,
  description: string,
  createdBy: string
): Promise<UserGroup> {
  const res = await fetch('/api/user-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, createdBy }),
  });
  if (!res.ok) throw new Error('创建用户组失败');
  return res.json();
}

/**
 * 获取所有用户组
 */
export async function getAllUserGroups(): Promise<UserGroup[]> {
  const res = await fetch('/api/groups');
  if (!res.ok) return [];
  return res.json();
}

/**
 * 分配用户到用户组（仅超级管理员）
 */
export async function assignUserToGroup(
  uid: string,
  groupId: string
): Promise<void> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userGroup: groupId }),
  });
  if (!res.ok) throw new Error('分配用户组失败');
}

/**
 * 更新用户组（仅超级管理员）
 */
export async function updateUserGroup(
  id: string,
  data: { name?: string; description?: string }
): Promise<UserGroup> {
  const res = await fetch(`/api/groups/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新用户组失败');
  return res.json();
}

/**
 * 删除用户组（仅超级管理员）
 */
export async function deleteUserGroup(id: string): Promise<void> {
  const res = await fetch(`/api/groups/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('删除用户组失败');
}
