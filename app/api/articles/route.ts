import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getFileFromGithub, updateFileInGithub } from '@/lib/github';

/**
 * Articles API
 * - 内容存储在 GitHub
 * - 数据库存储元数据（用于管理、删除工单）
 */

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const index = await db.hgetall('articles:index');
    
    const articles = Object.entries(index).map(([id, data]) => ({
      id,
      ...JSON.parse(data),
    }));

    // 按日期降序排序
    articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(articles);
  } catch (error) {
    console.error(JSON.stringify({ type: 'list_articles_error', message: (error as Error).message }));
    return NextResponse.json({ error: '获取文章列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { title, content, tags, coverImage, status } = await req.json();
    const id = `art-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    // 获取 GitHub 配置
    const db = getDb();
    const configStr = await db.get('config:main');
    let config: any = {};
    if (configStr) {
      config = JSON.parse(configStr);
    }

    // 文章元数据（存数据库）
    const articleMeta = {
      id,
      title,
      authorId: session.uid,
      authorName: session.email.split('@')[0],
      tags: tags || [],
      coverImage: coverImage || '',
      status: status || 'draft',
      createdAt: now,
      updatedAt: now,
      filePath: `articles/${id}.md`, // GitHub 文件路径
    };

    // 1. 保存元数据到数据库
    await db.set(`article:data:${id}`, JSON.stringify(articleMeta));
    await db.hset('articles:index', id, JSON.stringify(articleMeta));

    // 2. 保存内容到 GitHub
    if (config.githubRepo && config.githubToken) {
      const frontMatter = {
        title,
        author: articleMeta.authorName,
        tags: articleMeta.tags,
        cover: coverImage || '',
        date: now,
        status: status || 'draft',
      };
      
      const yaml = require('js-yaml');
      const fileContent = `---\n${yaml.dump(frontMatter)}---\n\n${content}`;
      
      await updateFileInGithub({
        repo: config.githubRepo,
        token: config.githubToken,
        path: `articles/${id}.md`,
        content: fileContent,
        message: `feat: create article "${title}"`,
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(JSON.stringify({ type: 'create_article_error', message: (error as Error).message }));
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 });
  }
}
