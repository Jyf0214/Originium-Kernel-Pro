/**
 * 基于数据库 KV 的登录失败计数器与临时锁定机制
 *
 * 锁定状态持久化到 originiumKV 表，Serverless 冷启动后不丢失。
 * 同一 email 连续 10 次失败后锁定 15 分钟。
 *
 * 注意：计数器本身仍为进程内 Map（冷启动后归零可接受），
 * 但锁定状态（lockedUntil）写入 KV，跨实例共享。
 */

import { getDb } from '@/lib/db';

// 失败阈值与锁定时长
const LOCK_THRESHOLD = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分钟
const LOCK_TTL_SECONDS = Math.ceil(LOCK_DURATION_MS / 1000);

// KV key 前缀
const LOCK_PREFIX = 'login:locked:';
const FAIL_PREFIX = 'login:fail:';

// 进程内快速失败计数（冷启动后归零，但锁定状态在 KV 中持久化）
const failCounts = new Map<string, number>();

/**
 * 标准化 email 为小写，统一 key 格式
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 脱敏邮箱：user@example.com → u***@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return local ? `${local[0]}***@${domain}` : '***';
}

/**
 * 记录一次登录失败，达到阈值时写入 KV 锁定并告警
 */
export async function recordLoginFailure(email: string): Promise<void> {
  const key = normalizeEmail(email);
  const db = getDb();

  // 先检查 KV 中是否已锁定
  const lockedUntilRaw = await db.get(`${LOCK_PREFIX}${key}`);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (Date.now() < lockedUntil) return; // 已锁定，不增加计数
  }

  // 递增进程内计数
  const current = (failCounts.get(key) ?? 0) + 1;
  failCounts.set(key, current);

  // 达到阈值：写入 KV 锁定并告警
  if (current >= LOCK_THRESHOLD) {
    const lockedUntil = Date.now() + LOCK_DURATION_MS;
    await db.set(`${LOCK_PREFIX}${key}`, String(lockedUntil), LOCK_TTL_SECONDS);
    console.warn(
      `[安全告警] 登录失败次数达到阈值：email=${maskEmail(key)}，失败次数=${current}，已锁定 ${LOCK_DURATION_MS / 60000} 分钟`,
    );
  }
}

/**
 * 检查指定 email 是否处于锁定状态
 *
 * 同时检查 KV（跨实例持久化）和进程内计数（防止服务器重启后丢失内存计数导致绕过）
 */
export async function isLoginLocked(email: string): Promise<boolean> {
  const key = normalizeEmail(email);
  const db = getDb();

  // 先检查进程内计数：若已达阈值则立即锁定，防止服务器重启后内存计数归零导致额外尝试
  const memCount = failCounts.get(key) ?? 0;
  if (memCount >= LOCK_THRESHOLD) return true;

  // 检查 KV 锁定状态（跨实例持久化）
  const lockedUntilRaw = await db.get(`${LOCK_PREFIX}${key}`);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (Date.now() < lockedUntil) return true;
  }

  return false;
}

/**
 * 登录成功后清除该 email 的所有失败记录
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  const key = normalizeEmail(email);
  failCounts.delete(key);
  const db = getDb();
  await db.del(`${LOCK_PREFIX}${key}`);
  await db.del(`${FAIL_PREFIX}${key}`);
}

/**
 * 获取当前失败次数（仅用于日志/诊断）
 */
export function getLoginAttempts(email: string): number {
  const key = normalizeEmail(email);
  return failCounts.get(key) ?? 0;
}
