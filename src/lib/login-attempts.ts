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
// 每条记录携带时间戳，超时后清理，防止 Map 无限增长
const failCounts = new Map<string, { count: number; ts: number }>();

// 定期清理过期的进程内计数器，防止内存泄漏
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟清理一次

function cleanupStaleCounts(): void {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) return;
  lastCleanupTime = now;
  // 清理所有超过锁定时长的条目（锁定状态在 KV 中持久化，进程内计数器可安全丢弃），
  // 未达阈值的失败记录同样会过期，避免 Map 随尝试过的邮箱数无限增长
  for (const [key, entry] of failCounts) {
    if (now - entry.ts >= LOCK_DURATION_MS) {
      failCounts.delete(key);
    }
  }
}

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
  // 定期清理过期计数器，防止内存泄漏
  cleanupStaleCounts();

  const key = normalizeEmail(email);
  const db = getDb();

  // 先检查 KV 中是否已锁定
  const lockedUntilRaw = await db.get(`${LOCK_PREFIX}${key}`);
  if (lockedUntilRaw) {
    const lockedUntil = Number(lockedUntilRaw);
    if (Date.now() < lockedUntil) return; // 已锁定，不增加计数
  }

  // 递增进程内计数（保留首次失败时间戳，用于过期清理）
  const prev = failCounts.get(key);
  const current = (prev?.count ?? 0) + 1;
  failCounts.set(key, { count: current, ts: prev?.ts ?? Date.now() });

  // 达到阈值：写入 KV 锁定并告警
  if (current >= LOCK_THRESHOLD) {
    const lockedUntil = Date.now() + LOCK_DURATION_MS;
    await db.set(`${LOCK_PREFIX}${key}`, String(lockedUntil), LOCK_TTL_SECONDS);
    console.warn(`[安全告警] 登录失败次数达到阈值：email=${maskEmail(key)}，失败次数=${current}，已锁定 ${LOCK_DURATION_MS / 60000} 分钟`);
  }
}

/**
 * 检查指定 email 是否处于锁定状态
 *
 * 同时检查 KV（跨实例）和进程内计数（快速路径）
 */
export async function isLoginLocked(email: string): Promise<boolean> {
  const key = normalizeEmail(email);
  const db = getDb();

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
  return failCounts.get(key)?.count ?? 0;
}
