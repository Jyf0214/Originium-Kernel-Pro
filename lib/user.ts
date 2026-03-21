/**
 * User Identity System - WID/UID Management
 * 
 * WID (User ID): 用户唯一标识符
 * - wid: 普通用户 (Boss)
 * - sudo: 特权用户/管理员 (admin)
 */

import { db, handleFirestoreError, OperationType } from '@/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * User Role Types
 */
export type UserRole = 'wid' | 'sudo';

/**
 * User Profile Interface
 */
export interface UserProfile {
  uid: string;          // Firebase Auth UID
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
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
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
  try {
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
    
    await setDoc(doc(db, 'users', uid), profile);
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'users');
    throw error;
  }
}

/**
 * Update user role (sudo only)
 */
export async function updateUserRole(
  uid: string, 
  newRole: UserRole,
  userGroup?: string
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      role: newRole,
      userGroup,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
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
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

/**
 * Request account deletion (30-day buffer)
 */
export async function requestAccountDeletion(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      status: 'pending_deletion',
      deletionRequestedAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
}

/**
 * Confirm account deletion (sudo only)
 */
export async function confirmAccountDeletion(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      status: 'deleted',
      deletionConfirmedAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
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
  try {
    const groupRef = doc(collection(db, 'userGroups'));
    const group: UserGroup = {
      id: groupRef.id,
      name,
      description,
      createdAt: new Date().toISOString(),
      createdBy,
      memberCount: 0,
    };
    
    await setDoc(groupRef, group);
    return group;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'userGroups');
    throw error;
  }
}

/**
 * Get all user groups
 */
export async function getAllUserGroups(): Promise<UserGroup[]> {
  try {
    const groupsRef = collection(db, 'userGroups');
    const snapshot = await getDocs(groupsRef);
    return snapshot.docs.map(doc => doc.data() as UserGroup);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'userGroups');
    return [];
  }
}

/**
 * Assign user to group (sudo only)
 */
export async function assignUserToGroup(
  uid: string,
  groupId: string
): Promise<void> {
  try {
    // Update user's group
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      userGroup: groupId,
      updatedAt: new Date().toISOString(),
    });
    
    // Increment group member count
    const groupDocRef = doc(db, 'userGroups', groupId);
    const groupDoc = await getDoc(groupDocRef);
    if (groupDoc.exists()) {
      const currentCount = groupDoc.data().memberCount || 0;
      await updateDoc(groupDocRef, {
        memberCount: currentCount + 1,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    throw error;
  }
}
