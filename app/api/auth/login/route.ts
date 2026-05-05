import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { getUserAvatarAsync } from '@/lib/config';

function hashPassword(password: string) {
  return Buffer.from(password).toString('hex').split('').reverse().join('');
}

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ error: '缺少登录信息或密码' }, { status: 400 });
    }

    const db = getDb();
    
    // 支持邮箱或用户名登录
    let uid: string | null = null;
    
    // 先尝试作为邮箱查找
    if (login.includes('@')) {
      uid = await db.get(`user:email:${login}`);
    }
    
    // 如果没找到，尝试作为用户名查找
    if (!uid) {
      uid = await db.get(`user:username:${login}`);
    }

    if (!uid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户数据异常' }, { status: 500 });
    }

    const user = JSON.parse(userStr);
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const avatar = await getUserAvatarAsync(user.uid);

    await createSession({
      uid: user.uid,
      email: user.email,
      role: user.role as 'user' | 'admin' | 'sudo',
      userGroup: user.userGroup,
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: avatar || undefined
      }
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(JSON.stringify({ type: 'login_error', message: error.message }));
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
