/**
 * API 密钥登录
 * POST /api/auth/apikey-login
 *
 * 请求体: { key: "sk-xxx" }
 * 验证 API 密钥 → 检查 2FA → 创建 Session Cookie → 返回成功
 *
 * 用途:在浏览器中通过 API 密钥登录,替代账号密码
 */
import { type NextRequest, NextResponse } from 'next/server';
import { hashApiKey, createSession, createTempToken, normalizeRole } from '@/lib/auth';
import { parsePermissions } from '@/lib/api-key-permissions';
import { getDb } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/auth/apikey-login');

export async function POST(req: NextRequest) {
  // 频率限制：同一 IP 5 分钟内最多 5 次 API 密钥登录尝试
  const rl = checkRateLimit(req, 'apikey-login', 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    logger.warn('POST', 'API 密钥登录频率超限', { retryAfterMs: rl.retryAfterMs });
    return NextResponse.json(
      { error: getTranslate('api.auth.loginTooFrequent', { seconds: Math.ceil(rl.retryAfterMs / 1000) }) },
      { status: 429 },
    );
  }

  let body: { key?: string } = {};
  try {
    body = (await req.json()) as { key?: string };
  } catch {
    // 无 body
  }

  const rawKey = (body.key ?? '').trim();
  if (!rawKey) {
    return NextResponse.json({ error: getTranslate('api.auth.enterApiKey') }, { status: 400 });
  }

  if (!rawKey.startsWith('sk-')) {
    return NextResponse.json({ error: getTranslate('api.auth.invalidApiKeyFormat') }, { status: 400 });
  }

  const db = getDb();
  if (!db.prisma) {
    return NextResponse.json({ error: getTranslate('api.common.dbNotConfigured') }, { status: 503 });
  }

  const hashed = hashApiKey(rawKey);
  const row = await db.prisma.apiKey.findUnique({ where: { key: hashed } });
  if (!row) {
    logger.warn('POST', 'API 密钥无效');
    void logAudit('apikey_login_failed', 'auth', 'API 密钥登录失败：密钥无效', 'unknown');
    return NextResponse.json({ error: getTranslate('api.auth.invalidApiKey') }, { status: 401 });
  }

  // 通过 UID 查用户信息
  const userRaw = await db.get(`user:uid:${row.uid}`);
  if (!userRaw) {
    logger.warn('POST', '关联用户不存在', { uid: row.uid });
    void logAudit('apikey_login_failed', 'auth', 'API 密钥登录失败：关联用户不存在', 'unknown');
    return NextResponse.json({ error: getTranslate('api.auth.linkedUserNotFound') }, { status: 401 });
  }

  let user: { uid: string; email: string; role: string; userGroup?: string; twoFactorEnabled?: boolean };
  try {
    user = JSON.parse(userRaw);
  } catch {
    logger.error('POST', '用户数据 JSON 解析失败', { uid: row.uid });
    return NextResponse.json({ error: getTranslate('api.auth.userDataError') }, { status: 500 });
  }

  // 更新最后使用时间(异步,不阻塞响应)
  void db.prisma.apiKey.update({ where: { id: row.id }, data: { lastUsed: new Date() } }).catch(() => { /* best-effort */ });

  // 检查是否启用了 2FA — API 密钥登录不得绕过双因素认证
  if (user.twoFactorEnabled) {
    await createTempToken(user.uid);
    logger.info('POST', 'API 密钥登录需要 2FA 验证', { uid: user.uid });
    return NextResponse.json({ requires2FA: true });
  }

  // 运行时验证 role 值，防止无效角色传递到 session；存量 'sudo' 归一化为 'root'
  const validRoles = ['user', 'admin', 'root', 'sudo'] as const;
  const safeRole = validRoles.includes(user.role as typeof validRoles[number]) ? normalizeRole(user.role) : 'user';

  // 加载 API 密钥权限配置并写入 session，避免浏览器登录后拥有全部权限（绕过细粒度权限）
  const permissions = parsePermissions(row.permissions);

  // 创建 Session Cookie
  await createSession({
    uid: user.uid,
    email: user.email,
    role: safeRole,
    userGroup: user.userGroup,
    // permissions 为 null 表示全部权限(向后兼容)，与 API 密钥认证路径语义一致
    ...(permissions ? { permissions } : {}),
  });

  logger.info('POST', 'API 密钥登录成功', { uid: user.uid });
  void logAudit('apikey_login', 'auth', 'API 密钥登录成功', user.uid);
  return NextResponse.json({
    success: true,
    user: { email: user.email, role: user.role },
  });
}
