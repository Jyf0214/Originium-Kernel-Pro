import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';

const logger = createApiLogger('/api/users/[uid]');

export const GET = apiHandler('GET', { label: '获取用户信息', requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('GET', '获取用户信息', { uid });
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('GET', '用户不存在', { uid });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = JSON.parse(userStr);
  const config = loadConfig();
  const avatar = config.users?.[uid]?.avatar ?? config.auth?.admin?.avatar ?? null;

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
  });
});

export const PATCH = apiHandler('PATCH', { label: '更新用户信息', requireAdmin: true }, async (req, context) => {
  const uid = await getParam(context, 'uid');
  logger.info('PATCH', '更新用户信息', { uid });
  const db = getDb();
  const userStr = await db.get(`user:uid:${uid}`);

  if (!userStr) {
    logger.warn('PATCH', '用户不存在', { uid });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = JSON.parse(userStr);
  const body = await req.json();
  const { role, userGroup } = body;

  if (role !== undefined) {
    const validRoles: UserRole[] = ['user', 'admin', 'sudo'];
    if (!validRoles.includes(role)) {
      logger.warn('PATCH', '无效角色', { role });
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 安全检查：只有 sudo 用户可以将其他用户设为 admin 或 sudo
    const currentSession = await getSession();
    if (currentSession && currentSession.role !== 'sudo') {
      // admin 用户只能将其他用户设为 user，不能设为 admin 或 sudo
      if (role === 'admin' || role === 'sudo') {
        logger.warn('PATCH', '权限不足：admin 不能将用户提升为 admin 或 sudo', { uid, requestedRole: role });
        return NextResponse.json({ error: '仅超级管理员可以设置管理员或超级管理员角色' }, { status: 403 });
      }
    }

    user.role = role;
  }

  if (userGroup !== undefined) {
    user.userGroup = userGroup ?? undefined;
  }

  await db.set(`user:uid:${uid}`, JSON.stringify(user));
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
