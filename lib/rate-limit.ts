import { type NextRequest } from 'next/server';

/**
 * @file 基于内存的频率限制器
 *
 * 已知限制：
 * - 当前实现使用进程内 Map 存储频率限制计数器，仅在单实例场景下有效。
 * - 在 Vercel 等 Serverless 环境中，每次冷启动会创建新的进程实例，内存状态无法
 *   跨实例共享，导致频率限制可能被绕过（每个实例独立计数）。
 * - 服务器重启后所有计数器重置。
 *
 * TODO: 对于生产环境的 Serverless 部署，应迁移至分布式存储后端（如 Vercel KV、
 * Upstash Redis 或 Cloudflare Workers KV），以实现跨实例的统一点频限制。
 * 迁移时建议保持现有 rateLimit / checkRateLimit / getClientIp 的函数签名不变，
 * 仅替换内部 store 的实现。
 */

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
 * 从请求头中提取客户端真实 IP
 * 优先使用 x-forwarded-for（Vercel/反向代理场景），其次 x-real-ip，最后回退 127.0.0.1
 *
 * 安全说明：x-forwarded-for 和 x-real-ip 均为客户端可控请求头，在没有可信反向代理
 * （如 Vercel Edge Network、Nginx real_ip 模块）的场景下可被伪造，导致频率限制
 * 被绕过。在 Vercel 部署环境中，边缘网络会覆写这些头部，风险可控；若自建部署，
 * 应在反向代理层配置 trusted upstream 并剥离客户端传入的伪造头部。
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const firstIp = forwarded.split(',')[0];
    if (firstIp) return firstIp.trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // 无法识别 IP 时使用固定标识，所有匿名请求共享同一限频条目，防止内存无限增长
  return 'anon:unknown';
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
