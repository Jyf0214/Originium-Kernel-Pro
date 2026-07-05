import { type NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDb } from '@/lib/db';
import { createSession, createTempToken } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { getClerkAuth, isClerkConfigured } from '@/lib/clerk-dynamic';

const logger = createApiLogger('/api/auth/bind-verify');

/** Clerk 鉴权，返回 userId 或错误响应 */
async function authenticateClerkUser(_req: NextRequest): Promise<{ userId: string } | NextResponse> {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: 'Clerk 未配置' }, { status: 400 });
  }
  const authFn = await getClerkAuth();
  if (!authFn) {
    return NextResponse.json({ error: 'Clerk 模块不可用' }, { status: 500 });
  }
  const { userId } = await authFn();
  if (!userId) {
    logger.warn('POST', '未通过 Clerk 登录');
    return NextResponse.json({ error: '请先通过 Clerk 登录' }, { status: 401 });
  }
  return { userId };
}

const MASK_EMAIL = (e: string) => e.includes('@') ? `${e[0]}***@${e.split('@')[1]}` : '***';

/** 基于 Promise 的互斥锁，防止同一 key 的并发读-改-写竞态 */
const rateLimitLocks = new Map<string, Promise<void>>();

async function withRateLimitLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // 等待同 key 的上一把锁释放
  while (rateLimitLocks.has(key)) {
    await rateLimitLocks.get(key);
  }
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  rateLimitLocks.set(key, promise);
  try {
    return await fn();
  } finally {
    rateLimitLocks.delete(key);
    resolve!();
  }
}

async function checkRateLimit(db: ReturnType<typeof getDb>, email: string): Promise<NextResponse | null> {
  const key = `bind:attempts:${email}`;
  const raw = await db.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= 5) return NextResponse.json({ error: '验证码尝试次数过多，请重新获取' }, { status: 429 });
  await db.set(key, String(count + 1), 5 * 60);
  return null;
}

async function verifyCode(db: ReturnType<typeof getDb>, email: string, code: string): Promise<NextResponse | null> {
  const storedCode = await db.get(`bind:code:${email}`);
  // 使用常量时间比较防止时序侧信道攻击
  const codesMatch = storedCode?.length === code.length &&
    timingSafeEqual(Buffer.from(storedCode), Buffer.from(code));
  if (!codesMatch) {
    return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
  }
  await db.del(`bind:code:${email}`);
  await db.del(`bind:attempts:${email}`);
  return null;
}

const VALID_ROLES = ['user', 'admin', 'sudo'] as const;

/** 运行时验证 role 值，防止无效角色传递到 session */
function sanitizeRole(raw: string): typeof VALID_ROLES[number] {
  return VALID_ROLES.includes(raw as typeof VALID_ROLES[number]) ? raw as typeof VALID_ROLES[number] : 'user';
}

/** 同步 Clerk 账户绑定到 Prisma（尽力而为，失败不阻塞） */
async function syncClerkBinding(db: ReturnType<typeof getDb>, uid: string, userId: string): Promise<void> {
  if (!db.prisma) return;
  try {
    await db.prisma.user.update({
      where: { uid },
      data: { clerkId: userId, clerkLinkedAt: new Date() },
    });
  } catch {
    // Prisma 更新失败不阻塞（KV 已存储）
  }
}

/**
 * 查找用户、建立双向绑定关系、创建 session 或触发 2FA
 */
async function completeBinding(
  db: ReturnType<typeof getDb>,
  userId: string,
  email: string,
): Promise<NextResponse> {
  const uid = await db.get(`user:email:${email}`);
  if (!uid) {
    logger.warn('POST', '用户不存在', { email: MASK_EMAIL(email) });
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const userStr = await db.get(`user:uid:${uid}`);
  if (!userStr) {
    logger.error('POST', '用户数据异常', { uid });
    return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
  }

  const user = JSON.parse(userStr);

  const existingBinding = await db.get(`clerk:user:${userId}`);
  if (existingBinding && existingBinding !== uid) {
    logger.warn('POST', 'Clerk 账户已绑定其他用户', { userId });
    return NextResponse.json({ error: '该 Clerk 账户已绑定其他用户' }, { status: 409 });
  }

  await db.set(`clerk:user:${userId}`, uid);
  await db.set(`user:clerk:${uid}`, userId);
  await syncClerkBinding(db, uid, userId);
  await db.del(`bind:code:${email}`);

  if (user.twoFactorEnabled) {
    await createTempToken(user.uid);
    logger.info('POST', '绑定用户需要 2FA 验证', { uid: user.uid });
    return NextResponse.json({ requires2FA: true });
  }

  await createSession({
    uid: user.uid,
    email: user.email,
    role: sanitizeRole(user.role),
    userGroup: user.userGroup,
  });

  logger.info('POST', '账户绑定成功', { uid: user.uid, email });
  return NextResponse.json({
    success: true,
    user: { uid: user.uid, email: user.email, name: user.name },
  });
}

/**
 * 验证绑定验证码并完成账户绑定
 */
export async function POST(req: NextRequest) {
  try {
    const clerkResult = await authenticateClerkUser(req);
    if (clerkResult instanceof NextResponse) return clerkResult;
    const { userId } = clerkResult;

    const { email, code } = await req.json();
    if (!email || !code) {
      logger.warn('POST', '缺少参数');
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const db = getDb();

    const rateLimitErr = await withRateLimitLock(email, () => checkRateLimit(db, email));
    if (rateLimitErr) { logger.warn('POST', '验证码尝试次数过多', { email: MASK_EMAIL(email) }); return rateLimitErr; }

    const codeErr = await verifyCode(db, email, code);
    if (codeErr) { logger.warn('POST', '验证码错误或已过期'); return codeErr; }

    return await completeBinding(db, userId, email);
  } catch (error) {
    logger.error('POST', '绑定失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '绑定失败' }, { status: 500 });
  }
}

/**
 * 解绑 Clerk 账户
 */
export async function DELETE() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ error: 'Clerk 未配置' }, { status: 400 });
  }

  try {
    const authFn = await getClerkAuth();
    if (!authFn) {
      return NextResponse.json({ error: 'Clerk 模块不可用' }, { status: 500 });
    }

    const { userId } = await authFn();
    if (!userId) {
      logger.warn('DELETE', '未通过 Clerk 登录');
      return NextResponse.json({ error: '请先通过 Clerk 登录' }, { status: 401 });
    }

    const db = getDb();

    // 查找绑定关系
    const boundUid = await db.get(`clerk:user:${userId}`);
    if (!boundUid) {
      logger.warn('DELETE', '未绑定任何账户', { userId });
      return NextResponse.json({ error: '未绑定任何账户' }, { status: 404 });
    }

    // 删除绑定关系（双向）
    await db.del(`clerk:user:${userId}`);
    await db.del(`user:clerk:${boundUid}`);

    // 删除 Clerk session
    const { deleteSession } = await import('@/lib/auth');
    await deleteSession();

    logger.info('DELETE', '账户解绑成功', { uid: boundUid });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE', '解绑失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: '解绑失败' }, { status: 500 });
  }
}
