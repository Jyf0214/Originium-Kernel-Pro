import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserAvatar } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/users/[uid]');

/** 校验角色变更权限，返回 null 表示通过，否则返回错误 Response */
function validateRoleChange(
  role: UserRole,
  targetUser: Record<string, unknown>,
  session: { role: string } | undefined,
): NextResponse | null {
  const validRoles: UserRole[] = ['user', 'admin', 'sudo'];
  if (!validRoles.includes(role)) {
    logger.warn('PATCH', '无效角色', { role });
    return NextResponse.json({ error: getTranslate('api.users.invalidRole') }, { status: 400 });
  }
  if (session && session.role !== 'sudo') {
    if (role === 'admin' || role === 'sudo') {
      logger.warn('PATCH', '权限不足：admin 不能将用户提升为 admin 或 sudo', { requestedRole: role });
      return NextResponse.json({ error: getTranslate('api.users.sudoOnlyPromote') }, { status: 403 });
    }
    if (targetUser.role === 'sudo') {
      logger.warn('PATCH', '权限不足：admin 不能降级超级管理员');
      return NextResponse.json({ error: getTranslate('api.users.sudoOnlyModifySudo') }, { status: 403 });
    }
  }
  return null;
}

export const GET = apiHandler('GET', { label: getTranslate('api.users.getUser'), requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('GET', '获取用户信息', { uid });
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
