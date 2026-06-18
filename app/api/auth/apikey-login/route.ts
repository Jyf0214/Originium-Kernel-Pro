/**
 * API 密钥登录
 * POST /api/auth/apikey-login
 *
 * 请求体: { key: "sk-xxx" }
 * 验证 API 密钥 → 创建 Session Cookie → 返回成功
 *
 * 用途:在浏览器中通过 API 密钥登录,替代账号密码
 */
import { NextResponse } from 'next/server';
import { hashApiKey, createSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  let body: { key?: string } = {};
  try {
    body = (await req.json()) as { key?: string };
  } catch {
    // 无 body
  }

  const rawKey = (body.key ?? '').trim();
  if (!rawKey) {
    return NextResponse.json({ error: '请输入 API 密钥' }, { status: 400 });
  }

  if (!rawKey.startsWith('sk-')) {
    return NextResponse.json({ error: '无效的 API 密钥格式' }, { status: 400 });
  }

  const db = getDb();
  if (!db.prisma) {
    return NextResponse.json({ error: '数据库未配置' }, { status: 503 });
  }

  const hashed = hashApiKey(rawKey);
  const row = await db.prisma.apiKey.findUnique({ where: { key: hashed } });
  if (!row) {
    return NextResponse.json({ error: '密钥无效或已删除' }, { status: 401 });
  }

  // 通过 UID 查用户信息
  const userRaw = await db.get(`user:uid:${row.uid}`);
  if (!userRaw) {
    return NextResponse.json({ error: '关联用户不存在' }, { status: 401 });
  }

  const user = JSON.parse(userRaw) as { uid: string; email: string; role: string; userGroup?: string };

  // 更新最后使用时间(异步)
  void db.prisma.apiKey.update({ where: { id: row.id }, data: { lastUsed: new Date() } });

  // 创建 Session Cookie
  await createSession({
    uid: user.uid,
    email: user.email,
    role: user.role as 'admin' | 'sudo' | 'user',
    userGroup: user.userGroup,
  });

  return NextResponse.json({
    success: true,
    user: { email: user.email, role: user.role },
  });
}
