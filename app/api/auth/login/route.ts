import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession, createTempToken, type SessionPayload } from '@/lib/auth';
import { verifyPassword } from '@/lib/hash';
import { isLoginLocked, recordLoginFailure, clearLoginAttempts } from '@/lib/login-attempts';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/auth/login');

/**
 * POST /api/auth/login
 * 用户登录：验证邮箱密码，创建会话
 * 支持 2FA：密码正确但启用了 2FA 时返回 requires2FA: true
 */
export const POST = apiHandler('POST', { label: '用户登录' }, async (req) => {
  const body = await req.json();
  const { login: rawEmail, password } = (body ?? {}) as { login?: string; password?: string };

  // 输入验证
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  const pwd = typeof password === 'string' ? password : '';

  if (!email) {
    return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
  }
  if (!pwd) {
    return NextResponse.json({ error: '请输入密码' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  // 检查登录锁定
  if (await isLoginLocked(normalizedEmail)) {
    logger.warn('POST', '登录锁定中', { email: normalizedEmail });
    return NextResponse.json({ error: '登录尝试次数过多，请稍后再试' }, { status: 429 });
  }

  // 查找用户：优先 Prisma，降级 KV
  const db = getDb();
  let user: Record<string, unknown> | null = null;

  if (db.prisma) {
    try {
      const prismaUser = await db.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (prismaUser) {
        user = prismaUser as unknown as Record<string, unknown>;
      }
    } catch {
      // Prisma 查询失败，降级到 KV
    }
  }

  if (!user) {
    const uid = await db.get(`user:email:${normalizedEmail}`);
    if (uid) {
      const userStr = await db.get(`user:uid:${uid}`);
      if (userStr) {
        try {
          user = JSON.parse(userStr) as Record<string, unknown>;
        } catch {
          // JSON 解析失败
        }
      }
    }
  }

  if (!user) {
    // 用户不存在，记录失败但不透露具体原因
    await recordLoginFailure(normalizedEmail);
    logger.warn('POST', '登录失败：用户不存在', { email: normalizedEmail });
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  // 验证密码
  const storedPassword = user.password as string | undefined;
  if (!storedPassword) {
    await recordLoginFailure(normalizedEmail);
    logger.warn('POST', '登录失败：用户无密码字段', { email: normalizedEmail });
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  const passwordValid = await verifyPassword(pwd, storedPassword);
  if (!passwordValid) {
    await recordLoginFailure(normalizedEmail);
    logger.warn('POST', '登录失败：密码错误', { email: normalizedEmail });
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  // 检查 2FA 是否启用
  const twoFactorEnabled = Boolean(user.twoFactorEnabled);
  if (twoFactorEnabled) {
    // 创建临时令牌，等待 2FA 验证
    await createTempToken(user.uid as string);
    logger.info('POST', '需要 2FA 验证', { email: normalizedEmail });
    return NextResponse.json({ requires2FA: true });
  }

  // 密码验证通过，清除失败记录
  await clearLoginAttempts(normalizedEmail);

  // 校验角色白名单
  const validRoles = ['user', 'admin', 'sudo'] as const;
  const role = validRoles.includes(user.role as (typeof validRoles)[number])
    ? (user.role as SessionPayload['role'])
    : 'user';

  // 创建会话
  const sessionPayload: SessionPayload = {
    uid: user.uid as string,
    email: (user.email as string) || normalizedEmail,
    role,
    userGroup: user.userGroup as string | undefined,
  };

  await createSession(sessionPayload);

  const name = (user.name as string) || (user.username as string) || normalizedEmail;

  logger.info('POST', '登录成功', { uid: user.uid as string, email: normalizedEmail, role });

  return NextResponse.json({
    success: true,
    user: {
      uid: user.uid as string,
      email: (user.email as string) || normalizedEmail,
      name,
      role,
    },
  });
});
