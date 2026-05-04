import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendMail, generateResetEmailHtml, isSmtpConfigured } from '@/lib/mail';
import { randomBytes } from 'crypto';

function hashPassword(password: string) {
  return Buffer.from(password).toString('hex').split('').reverse().join('');
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json({ error: '邮件服务未配置' }, { status: 500 });
    }

    const db = getDb();
    const uid = await db.get(`user:email:${email}`);

    if (!uid) {
      return NextResponse.json({ success: true, message: '如果邮箱存在，重置链接已发送' }, { status: 201 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000;

    await db.set(`reset:${token}`, JSON.stringify({ uid, email, expiresAt }), 3600);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const sent = await sendMail({
      to: email,
      subject: 'Originium Kernel - 密码重置',
      html: generateResetEmailHtml(resetLink),
    });

    if (!sent) {
      return NextResponse.json({ error: '发送邮件失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '重置链接已发送' }, { status: 201 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('密码重置错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    const db = getDb();
    const resetData = await db.get(`reset:${token}`);

    if (!resetData) {
      return NextResponse.json({ error: '无效或过期的重置链接' }, { status: 400 });
    }

    const { uid, expiresAt } = JSON.parse(resetData);

    if (Date.now() > expiresAt) {
      await db.del(`reset:${token}`);
      return NextResponse.json({ error: '重置链接已过期' }, { status: 400 });
    }

    const userStr = await db.get(`user:uid:${uid}`);
    if (!userStr) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = JSON.parse(userStr);
    user.password = hashPassword(password);

    await db.set(`user:uid:${uid}`, JSON.stringify(user));
    await db.del(`reset:${token}`);

    return NextResponse.json({ success: true, message: '密码重置成功' }, { status: 201 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('密码重置错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
