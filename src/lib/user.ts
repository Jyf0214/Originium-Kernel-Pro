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
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'pending_deletion' | 'deleted';
  deletionRequestedAt?: string;
}

/**
 * 获取所有用户（仅超级管理员）
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/users');
  if (!res.ok) return [];
  return res.json();
}
