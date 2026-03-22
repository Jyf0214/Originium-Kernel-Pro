import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * 工单模板 API
 * - 工单模板只存储在数据库中
 * - 不上传到 GitHub 仓库
 */

// 获取所有模板
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const db = getDb();
    const templatesStr = await db.get('config:ticket-templates');
    const templates = templatesStr ? JSON.parse(templatesStr) : [];
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error(JSON.stringify({ type: 'get_templates_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取模板失败' }, { status: 500 });
  }
}

// 创建/更新模板
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id, name, description, fields, priority, autoAssign } = await req.json();
    
    if (!name || !fields) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const db = getDb();
    
    // 获取现有模板
    const templatesStr = await db.get('config:ticket-templates');
    let templates = templatesStr ? JSON.parse(templatesStr) : [];
    
    const templateId = id || `tpl-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    
    const template = {
      id: templateId,
      name,
      description: description || '',
      fields,
      priority: priority || 'medium',
      autoAssign: autoAssign || null,
      createdAt: id ? templates.find((t: any) => t.id === id)?.createdAt : now,
      updatedAt: now,
    };
    
    if (id) {
      // 更新
      const index = templates.findIndex((t: any) => t.id === id);
      if (index >= 0) {
        templates[index] = template;
      } else {
        templates.push(template);
      }
    } else {
      // 创建
      templates.push(template);
    }
    
    // 只保存到数据库，不上传到 GitHub
    await db.set('config:ticket-templates', JSON.stringify(templates));
    
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error(JSON.stringify({ type: 'save_template_error', message: (error as Error).message }));
    return NextResponse.json({ error: '保存模板失败' }, { status: 500 });
  }
}

// 删除模板
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'sudo')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    
    const db = getDb();
    const templatesStr = await db.get('config:ticket-templates');
    let templates = templatesStr ? JSON.parse(templatesStr) : [];
    
    templates = templates.filter((t: any) => t.id !== id);
    
    // 只保存到数据库，不上传到 GitHub
    await db.set('config:ticket-templates', JSON.stringify(templates));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'delete_template_error', message: (error as Error).message }));
    return NextResponse.json({ error: '删除模板失败' }, { status: 500 });
  }
}
