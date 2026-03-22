import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getFileFromGithub, updateFileInGithub } from '@/lib/github';

/**
 * Article Detail API (GET, PATCH, DELETE)
 * - 内容从 GitHub 读取
 * - 元数据从数据库读取
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    const metaStr = await db.get(`article:data:${id}`);
    if (!metaStr) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    
    const meta = JSON.parse(metaStr);
    
    // 从 GitHub 获取内容
    const configStr = await db.get('config:main');
    let content = '';
    
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.githubRepo && config.githubToken) {
        const file = await getFileFromGithub(config.githubRepo, config.githubToken, `articles/${id}.md`);
        if (file) {
          // 解析 front matter，提取内容
          const yaml = require('js-yaml');
          const match = file.content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
          if (match) {
            content = match[2];
          } else {
            content = file.content;
          }
        }
      }
    }

    return NextResponse.json({ ...meta, content });
  } catch (error) {
    console.error(JSON.stringify({ type: 'get_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取文章失败' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    
    const metaStr = await db.get(`article:data:${id}`);
    if (!metaStr) return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    
    const meta = JSON.parse(metaStr);
    
    // 检查权限
    if (meta.authorId !== session.uid && session.role !== 'admin' && session.role !== 'sudo') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const updated = { ...meta, ...body, updatedAt: new Date().toISOString() };
    delete updated.content; // 内容不存数据库
    
    // 更新数据库元数据
    await db.set(`article:data:${id}`, JSON.stringify(updated));
    await db.hset('articles:index', id, JSON.stringify(updated));

    // 更新 GitHub 内容
    if (body.content) {
      const configStr = await db.get('config:main');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.githubRepo && config.githubToken) {
          const yaml = require('js-yaml');
          const frontMatter = {
            title: updated.title,
            author: updated.authorName,
            tags: updated.tags,
            cover: updated.coverImage || '',
            date: updated.createdAt,
            status: updated.status,
          };
          const fileContent = `---\n${yaml.dump(frontMatter)}---\n\n${body.content}`;
          
          await updateFileInGithub({
            repo: config.githubRepo,
            token: config.githubToken,
            path: `articles/${id}.md`,
            content: fileContent,
            message: `update: article "${updated.title}"`,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(JSON.stringify({ type: 'update_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '更新文章失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const db = getDb();
    const metaStr = await db.get(`article:data:${id}`);
    if (!metaStr) return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    
    const meta = JSON.parse(metaStr);

    // 管理员直接删除
    if (session.role === 'admin' || session.role === 'sudo') {
      // 删除数据库元数据
      await db.del(`article:data:${id}`);
      await db.hdel('articles:index', id);
      
      // 删除 GitHub 文件
      const configStr = await db.get('config:main');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.githubRepo && config.githubToken) {
          const { deleteFileFromGithub } = await import('@/lib/github');
          await deleteFileFromGithub(config.githubRepo, config.githubToken, `articles/${id}.md`);
        }
      }
      
      return NextResponse.json({ success: true, message: '已永久删除' });
    }

    // 普通用户：进入删除队列（30天缓冲）
    if (meta.authorId !== session.uid) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const deletionInfo = {
      ...meta,
      status: 'pending_deletion',
      deletionRequestedAt: new Date().toISOString(),
    };

    await db.set(`article:data:${id}`, JSON.stringify(deletionInfo));
    await db.hset('articles:index', id, JSON.stringify(deletionInfo));

    return NextResponse.json({ 
      success: true, 
      message: '已提交删除申请，30天后自动删除' 
    });
  } catch (error) {
    console.error(JSON.stringify({ type: 'delete_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '删除文章失败' }, { status: 500 });
  }
}
