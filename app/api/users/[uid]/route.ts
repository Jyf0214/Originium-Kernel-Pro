import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig } from '@/lib/config';
import type { UserRole } from '@/lib/user';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';
import { getSession } from '@/lib/auth';

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

  let user;
  try {
    user = JSON.parse(userStr);
  } catch (error: unknown) {
    logger.error('GET', '用户数据解析失败', { uid, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'User data corrupted' }, { status: 500 });
  }

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

  let user;
  try {
    user = JSON.parse(userStr);
  } catch (error: unknown) {
    logger.error('PATCH', '用户数据解析失败', { uid, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'User data corrupted' }, { status: 500 });
  }

  const body = await req.json();
  const { role, userGroup } = body;

  if (role !== undefined) {
    const validRoles: UserRole[] = ['user', 'admin', 'sudo'];
    if (!validRoles.includes(role)) {
      logger.warn('PATCH', '无效角色', { role });
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (role === 'admin' || role === 'sudo') {
      const session = await getSession();
      if (session?.role !== 'sudo') {
        return NextResponse.json({ error: '仅超级管理员可分配管理员或更高角色' }, { status: 403 });
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
