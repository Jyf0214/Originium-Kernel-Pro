/**
 * User Identity System - WID/UID Management
 * 
 * WID (User ID): 用户唯一标识符
 * - wid: 普通用户 (Boss)
 * - sudo: 特权用户/管理员 (admin)
 */

/**
 * User Role Types
 */
export type UserRole = 'wid' | 'sudo';

/**
 * User Profile Interface
 */
export interface UserProfile {
  uid: string;
  wid: string;          // User's WID (formatted user ID)
  email: string;
  name: string;
  role: UserRole;       // 'wid' (普通用户) or 'sudo' (管理员)
  userGroup?: string;   // 用户组 ID
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  
  // Registration info (for admin tracking)
  registrationInfo?: {
    ip: string;
    userAgent: string;
    timestamp: string;
  };
  
  // Account status
  status: 'active' | 'pending_deletion' | 'deleted';
  deletionRequestedAt?: string;  // 注销申请时间
  deletionConfirmedAt?: string;  // 管理员确认时间
}

/**
 * Generate WID from UID
 * Format: WID-{UID last 8 chars}
 */
export function generateWID(uid: string): string {
  const shortId = uid.slice(-8).toUpperCase();
  return `WID-${shortId}`;
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // TODO: 实现基于 API 的获取逻辑
  return null;
}

/**
 * Create user profile on registration
 */
export async function createUserProfile(
  uid: string,
  email: string,
  name: string,
  role: UserRole = 'wid',
  registrationInfo?: { ip: string; userAgent: string }
): Promise<UserProfile> {
  const wid = generateWID(uid);
  const now = new Date().toISOString();
  
  const profile: UserProfile = {
    uid,
    wid,
    email,
    name,
    role,
    photoURL: '',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    ...(registrationInfo && {
      registrationInfo: {
        ...registrationInfo,
        timestamp: now,
      }
    })
  };
  
  // TODO: 调用 API 保存
  return profile;
}

/**
 * Update user role (sudo only)
 */
export async function updateUserRole(
  uid: string, 
  newRole: UserRole,
  userGroup?: string
): Promise<void> {
  // TODO: 实现基于 API 的更新逻辑
  console.log('Update user role:', uid, newRole, userGroup);
}

/**
 * Check if user is sudo (admin)
 */
export function isSudoUser(user: UserProfile | null): boolean {
  return user?.role === 'sudo';
}

/**
 * Check if user is wid (normal user / Boss)
 */
export function isWidUser(user: UserProfile | null): boolean {
  return user?.role === 'wid';
}

/**
 * Get all users (sudo only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  // TODO: 实现基于 API 的列表逻辑
  return [];
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  // TODO: 实现基于 API 的过滤逻辑
  return [];
}

/**
 * Request account deletion (30-day buffer)
 */
export async function requestAccountDeletion(uid: string): Promise<void> {
  // TODO: 实现基于 API 的删除请求逻辑
}

/**
 * Confirm account deletion (sudo only)
 */
export async function confirmAccountDeletion(uid: string): Promise<void> {
  // TODO: 实现基于 API 的删除确认逻辑
}

/**
 * User Group Management
 */
export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;  // sudo user UID
  memberCount: number;
}

/**
 * Create user group (sudo only)
 */
export async function createUserGroup(
  name: string,
  description: string,
  createdBy: string
): Promise<UserGroup> {
  const group: UserGroup = {
    id: Math.random().toString(36).substr(2, 9),
    name,
    description,
    createdAt: new Date().toISOString(),
    createdBy,
    memberCount: 0,
  };
  
  // TODO: 调用 API 保存
  return group;
}

/**
 * Get all user groups
 */
export async function getAllUserGroups(): Promise<UserGroup[]> {
  // TODO: 实现基于 API 的列表逻辑
  return [];
}

/**
 * Assign user to group (sudo only)
 */
export async function assignUserToGroup(
  uid: string,
  groupId: string
): Promise<void> {
  // TODO: 实现基于 API 的分配逻辑
}
