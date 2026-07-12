import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/auth/me');

/**
 * GET /api/auth/me
 * 返回当前登录用户信息，未登录时返回 authenticated: false
 */
export const GET = apiHandler('GET', { label: '获取当前用户信息' }, async () => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  // 从数据库获取用户完整信息（session 中没有 name 字段）
  let name = '';
  try {
    const db = getDb();
    // 优先使用 Prisma 查询
    if (db.prisma) {
      try {
        const user = await db.prisma.user.findUnique({
          where: { uid: session.uid },
          select: { name: true },
        });
        if (user?.name) name = user.name;
      } catch {
        // Prisma 查询失败，降级到 KV
      }
    }
    // 降级到 KV 查询
    if (!name) {
      const userStr = await db.get(`user:uid:${session.uid}`);
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as Record<string, unknown>;
          name = (user.name as string) || (user.username as string) || '';
        } catch {
          // JSON 解析失败
        }
      }
    }
  } catch {
    // 数据库不可用时降级，不阻断认证状态返回
  }

  logger.info('GET', '获取当前用户信息', { uid: session.uid });

  return NextResponse.json({
    authenticated: true,
    user: {
      uid: session.uid,
      email: session.email,
      name: name || session.email,
      role: session.role,
      userGroup: session.userGroup,
    },
  });
});
