import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateUID, createSession } from '@/lib/auth';
import { loadConfigAsync } from '@/lib/config';

function hashPassword(password: string) {
  return Buffer.from(password).toString('hex').split('').reverse().join('');
}

export async function POST(req: NextRequest) {
  try {
    // 检查是否允许注册
    const config = await loadConfigAsync();
    if (!config.auth.allowRegistration) {
      return NextResponse.json(
        { error: '管理员已关闭注册', errorKey: 'registration_closed' },
        { status: 403 }
      );
    }

    const { email, password, name, username, userGroup } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6个字符' }, { status: 400 });
    }

    if (username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return NextResponse.json({ error: '用户名只能包含字母、数字和下划线，3-20个字符' }, { status: 400 });
      }
    }

    const db = getDb();

    // 检查是否是第一个用户
    const userListStr = await db.get('users:all:list');
    const isFirstUser = !userListStr || JSON.parse(userListStr).length === 0;

    // 检查邮箱是否已注册
    const existingEmail = await db.get(`user:email:${email}`);
    if (existingEmail) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
    }

    // 检查用户名是否已使用
    if (username) {
      const existingUsername = await db.get(`user:username:${username}`);
      if (existingUsername) {
        return NextResponse.json({ error: '该用户名已被使用' }, { status: 409 });
      }
    }

    const uid = generateUID();

    // 第一个用户自动成为 sudo
    const userRole = isFirstUser ? 'sudo' : 'user';
    const finalUserGroup = isFirstUser ? 'admin' : (userGroup || null);

    // 非第一个用户不能选择管理员组
    if (!isFirstUser && finalUserGroup === 'admin') {
      return NextResponse.json({ error: '无法选择管理员用户组' }, { status: 403 });
    }

    // 存储用户数据
    const hashedPassword = hashPassword(password);
    const userPayload = {
      uid,
      email,
      username: username || null,
      name,
      role: userRole,
      userGroup: finalUserGroup,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    await db.set(`user:uid:${uid}`, JSON.stringify(userPayload));
    await db.set(`user:email:${email}`, uid);

    // 存储用户名映射
    if (username) {
      await db.set(`user:username:${username}`, uid);
    }

    // 更新用户列表
    const userList = userListStr ? JSON.parse(userListStr) : [];
    userList.push(uid);
    await db.set('users:all:list', JSON.stringify(userList));

    await createSession({ uid, email, role: userRole as 'sudo' | 'user' | 'admin' });

    return NextResponse.json({
      success: true,
      user: { uid, email, username, name, role: userRole, userGroup: finalUserGroup },
      message: isFirstUser ? '注册成功！您是首个用户，已获得管理员权限。' : '注册成功！'
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(JSON.stringify({ type: 'register_error', message: error.message }));
    return NextResponse.json({ error: error.message || '注册失败' }, { status: 500 });
  }
}
