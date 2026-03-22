import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// 获取用户组列表
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    
    if (!groupsStr) {
      // 返回默认用户组
      return NextResponse.json([
        { id: 'default', name: '默认组', description: '默认用户组' },
      ]);
    }
    
    const groups = JSON.parse(groupsStr);
    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: '获取用户组失败' }, { status: 500 });
  }
}

// 创建用户组（仅管理员）
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { name, description } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: '用户组名称不能为空' }, { status: 400 });
    }
    
    if (name === 'admin') {
      return NextResponse.json({ error: '无法创建管理员用户组' }, { status: 403 });
    }

    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    const groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    // 检查是否已存在
    if (groups.some((g: any) => g.name === name)) {
      return NextResponse.json({ error: '用户组已存在' }, { status: 409 });
    }
    
    const newGroup = {
      id: `group-${Date.now()}`,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
    };
    
    groups.push(newGroup);
    await db.set('user-groups:list', JSON.stringify(groups));
    
    return NextResponse.json({ success: true, group: newGroup });
  } catch (error: any) {
    return NextResponse.json({ error: '创建用户组失败' }, { status: 500 });
  }
}

// 删除用户组（仅管理员）
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    
    const db = getDb();
    const groupsStr = await db.get('user-groups:list');
    const groups = groupsStr ? JSON.parse(groupsStr) : [];
    
    const filtered = groups.filter((g: any) => g.id !== id);
    await db.set('user-groups:list', JSON.stringify(filtered));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: '删除用户组失败' }, { status: 500 });
  }
}
