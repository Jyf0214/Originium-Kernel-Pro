import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserAvatar } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';
import { isRootRole, getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/users/[uid]');

/**
 * API 密钥细粒度权限检查（用户管理）
 * Cookie 认证(浏览器)直接通过；密钥认证检查 user_* 权限
 */
async function requireUsersPerm(action: 'user_read' | 'user_write'): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, action);
}

/** 校验角色变更权限，返回 null 表示通过，否则返回错误 Response */
function validateRoleChange(
  role: UserRole,
  targetUser: Record<string, unknown>,
  session: { role: string } | undefined,
): NextResponse | null {
  // 存量 'sudo' 归一化后仅接受 user/admin/root
  const validRoles: UserRole[] = ['user', 'admin', 'root'];
  if (!validRoles.includes(role)) {
    logger.warn('PATCH', '无效角色', { role });
    return NextResponse.json({ error: getTranslate('api.users.invalidRole') }, { status: 400 });
  }
  if (session && !isRootRole(session.role)) {
    if (role === 'admin' || role === 'root') {
      logger.warn('PATCH', '权限不足：admin 不能将用户提升为 admin 或 root', { requestedRole: role });
      return NextResponse.json({ error: getTranslate('api.users.rootOnlyPromote') }, { status: 403 });
    }
    if (isRootRole(targetUser.role as string)) {
      logger.warn('PATCH', '权限不足：admin 不能降级超级管理员');
      return NextResponse.json({ error: getTranslate('api.users.rootOnlyModifyRoot') }, { status: 403 });
    }
  }
  return null;
}

export const GET = apiHandler('GET', { label: getTranslate('api.users.getUser'), requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('GET', '获取用户信息', { uid });
  // API 密钥认证的请求需 user_read 权限
  const denied = await requireUsersPerm('user_read');
  if (denied) return denied;
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('GET', '用户不存在', { uid });
    return NextResponse.json({ error: getTranslate('api.auth.userNotFound') }, { status: 404 });
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userStr);
  } catch {
    return NextResponse.json({ error: getTranslate('api.user.dataCorrupted') }, { status: 500 });
  }
  const avatar = await getUserAvatar();

  logger.info('GET', '获取用户信息成功', { uid });
  return NextResponse.json({
    uid: user.uid,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    role: user.role,
    userGroup: user.userGroup,
    status: user.status,
    avatar,
  }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});

export const PATCH = apiHandler('PATCH', { label: getTranslate('api.users.updateUser'), requireAdmin: true }, async (req, context, session) => {
  const uid = await getParam(context, 'uid');
  logger.info('PATCH', '更新用户信息', { uid });
  // API 密钥认证的请求需 user_write 权限
  const denied = await requireUsersPerm('user_write');
  if (denied) return denied;
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('PATCH', '用户不存在', { uid });
    return NextResponse.json({ error: getTranslate('api.auth.userNotFound') }, { status: 404 });
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(userStr);
  } catch {
    return NextResponse.json({ error: getTranslate('api.user.dataCorrupted') }, { status: 500 });
  }
  const body = await req.json();
  const { role, userGroup } = body;
  const previousRole = user.role as string | undefined;

  if (role !== undefined) {
    const roleErr = await validateRoleChange(role, user, session);
    if (roleErr) return roleErr;
    user.role = role;
  }

  if (userGroup !== undefined) {
    user.userGroup = userGroup ?? undefined;
  }

  await db.set(`user:uid:${uid}`, JSON.stringify(user));

  // 角色变更时递增会话版本号，使旧 JWT 失效
  if (role !== undefined && role !== previousRole) {
    const currentSv = await db.get(`user:sv:${uid}`);
    const newSv = (currentSv !== null && currentSv !== undefined ? Number(currentSv) : 0) + 1;
    await db.set(`user:sv:${uid}`, String(newSv));
  }

  logger.info('PATCH', '用户更新成功', { uid });
  return NextResponse.json({
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: user.role,
    userGroup: user.userGroup,
    status: user.status,
  });
});
