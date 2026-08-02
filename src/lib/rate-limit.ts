import { type NextRequest } from 'next/server';
import { createHash } from 'crypto';

interface RateLimitEntry {
  /** 当前窗口内的请求次数 */
  count: number;
  /** 窗口结束时间戳（毫秒） */
  resetTime: number;
}

/**
 * 基于内存的频率限制器
 * 使用 Map 存储 IP → { count, resetTime } 映射，无需外部依赖。
 * 注意：服务器重启后计数器重置；多实例部署时各自独立计数。
 */
const store = new Map<string, RateLimitEntry>();

/** 定期清理过期条目，防止内存泄漏 */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}

/**
 * 从请求中提取客户端标识用于频率限制
 *
 * 安全策略：x-forwarded-for 和 x-real-ip 均为客户端可控请求头，
 * 在没有可信反向代理的场景下可被伪造，导致频率限制被完全绕过。
 *
 * 信任策略：
 * - Vercel 部署（VERCEL=1）：边缘网络覆写这些头部，可信任
 * - 自建部署：仅当 TRUSTED_PROXY_COUNT 环境变量明确设置时才信任
 *   （值为反向代理层数，如 Nginx 单层代理设为 1）
 * - 未配置时：使用请求指纹（IP+UA+Accept 组合的哈希），不可伪造
 */
export function getClientIp(req: NextRequest): string {
  // Vercel 部署：边缘网络覆写头部，可信任
  const isVercel = process.env.VERCEL === '1';
  // 自建部署：仅当显式配置了可信代理层数时才信任 XFF
  const trustedProxyCount = parseInt(process.env.TRUSTED_PROXY_COUNT ?? '0', 10);

  if (isVercel || trustedProxyCount > 0) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      // 当存在多层代理时，取倒数第 N 个（最靠近真实客户端的那个）
      const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
      const idx = Math.max(0, ips.length - trustedProxyCount);
      if (ips[idx]) return ips[idx];
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp;
  }

  // 回退方案：使用请求指纹（不可伪造的多因素组合）
  // 攻击者无法同时伪造 IP、User-Agent 和 Accept 头的哈希
  const fp = [
    req.headers.get('user-agent') ?? '',
    req.headers.get('accept') ?? '',
    req.headers.get('accept-language') ?? '',
  ].join('|');
  const hash = createHash('sha256').update(fp).digest('hex').slice(0, 16);
  return `fp:${hash}`;
}

/**
 * 检查频率限制
 * @param key       唯一标识（通常为 `${ip}:${route}`）
 * @param limit     窗口内允许的最大请求数
 * @param windowMs  时间窗口（毫秒）
 * @returns { allowed: boolean; retryAfterMs: number }
 *   - allowed 为 true 表示请求被允许
 *   - allowed 为 false 时 retryAfterMs 为距离窗口重置的剩余毫秒数
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  cleanup(now);

  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    // 新窗口或窗口已过期，重置计数
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    // 已达上限，计算剩余等待时间
    const retryAfterMs = entry.resetTime - now;
    return { allowed: false, retryAfterMs };
  }

  // 未达上限，计数递增
  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * 便捷函数：从 NextRequest 中提取 IP 并执行频率限制检查
 * @param req       当前请求对象
 * @param routeName 路由名称，用于构建唯一 key
 * @param limit     窗口内允许的最大请求数
 * @param windowMs  时间窗口（毫秒）
 */
export function checkRateLimit(
  req: NextRequest,
  routeName: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const ip = getClientIp(req);
  const key = `${ip}:${routeName}`;
  return rateLimit(key, limit, windowMs);
}
