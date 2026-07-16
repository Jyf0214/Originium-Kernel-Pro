import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { loadConfig, canAccess, hasDatabase, type AppConfig } from '@/lib/config';
import { getDraft, saveDraft } from '@/lib/draft-storage';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler, getParam } from '@/lib/api-handler';

const logger = createApiLogger('/api/articles/[id]');

/**
 * Article Detail API (GET, PATCH, DELETE)
 *
 * - GET：草稿从数据库读内容，已发布通过 /api/github GET 端点读取
 * - PATCH：发布时通过 /api/github POST 端点推送 GitHub；草稿更新存数据库
 * - DELETE：通过 /api/github POST 端点删除 GitHub 文件 + 数据库记录
 */

async function handleDraftArticleResponse(
  id: string,
  meta: Record<string, unknown>,
): Promise<NextResponse> {
  if (!meta.content) {
    const fileContent = await getDraft(id);
    meta.content = fileContent ?? '';
  }
  return NextResponse.json(meta, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
}

async function handlePublishedArticleResponse(
  meta: Record<string, unknown>,
  req: NextRequest,
): Promise<NextResponse | null> {
  if (!(meta.status === 'published' && meta.slug)) {
    return null;
  }
  try {
    const ghResponse = await fetch(
      `${req.nextUrl.origin}/api/github?path=posts${String(meta.slug)}.md`,
    );
    if (!ghResponse.ok) {
      return null;
    }
    const { frontMatter, body } = await ghResponse.json();
    return NextResponse.json({
      id: meta.id,
      slug: meta.slug,
      title: frontMatter.title ?? meta.title,
      content: body ?? '',
      author: frontMatter.author ?? meta.authorName,
      tags: frontMatter.tags ?? meta.tags ?? [],
      cover: frontMatter.cover ?? meta.coverImage,
      description: frontMatter.description ?? meta.description,
      date: frontMatter.date ?? meta.createdAt,
      status: 'published',
    }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    });
  } catch {
    // 网络异常时降级返回元数据，不阻断文章展示
    return null;
  }
}

async function handleFileSystemLookup(
  id: string,
  isAuthenticated: boolean,
  dbAvailable: boolean,
  config: AppConfig,
): Promise<NextResponse | null> {
  const { getContentFile } = await import('@/lib/content');
  const slug = id.startsWith('/') ? id : `/${id}`;
  const file = getContentFile('posts', slug);
  if (!file) {
    return null;
  }
  if (!(await canAccess('posts', file.slug, isAuthenticated, dbAvailable, config))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  return NextResponse.json({
    id: file.slug,
    slug: file.slug,
    title: file.meta.title,
    content: file.content,
    author: file.meta.author,
    date: file.meta.date,
    tags: file.meta.tags ?? [],
    cover: file.meta.cover,
    description: file.meta.description,
    status: 'published',
  }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
}

export const GET = apiHandler('GET', { label: '获取文章详情' }, async (req, context, session) => {
  const id = await getParam(context, 'id');
  logger.info('GET', '获取文章详情', { id });
  logger.info('GET', '读取文章详情', { id });
  const db = getDb();

  const metaStr = await db.get(`article:data:${id}`);
  if (metaStr) {
    const meta = JSON.parse(metaStr) as Record<string, unknown>;
    if (meta.status === 'draft') {
      // session 来自 apiHandler 注入（requireAuth=false 时为 undefined）
      if (!session || (meta.authorId !== session.uid && session.role !== 'admin' && session.role !== 'sudo')) {
        logger.warn('GET', '无权限查看草稿', { id, uid: session?.uid });
        return NextResponse.json({ error: '无权限' }, { status: 403 });
      }
      return handleDraftArticleResponse(id, meta);
    }
    const publishedResponse = await handlePublishedArticleResponse(meta, req);
    if (publishedResponse) {
      return publishedResponse;
    }
    // 剔除内部字段（authorId、content）后返回
    const { authorId: _authorId, content: _content, ...safeMeta } = meta;
    return NextResponse.json(safeMeta, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    });
  }

  const isAuthenticated = !!session;
  const config = await loadConfig();
  const dbAvailable = hasDatabase();
  const fileResponse = await handleFileSystemLookup(id, isAuthenticated, dbAvailable, config);
  if (fileResponse) {
    return fileResponse;
  }

  return NextResponse.json({ error: '文章不存在' }, { status: 404 });
});

function checkArticlePermission(
  meta: Record<string, unknown>,
  session: { uid: string; role: string },
): boolean {
  if (meta.authorId !== session.uid && session.role !== 'admin' && session.role !== 'sudo') {
    logger.warn('PATCH', '无权限', { id: meta.id as string, uid: session.uid });
    return false;
  }
  return true;
}

async function handlePublishArticle(
  body: Record<string, unknown>,
  updated: Record<string, unknown>,
  id: string,
  req: NextRequest,
  db: ReturnType<typeof getDb>,
): Promise<NextResponse> {
  const postSlug = (body.slug as string) || (updated.slug as string) || `/${String(updated.authorName)}/${id}`;
  // 路径穿越防护：拒绝含 .. 或 \ 的 slug
  if (typeof postSlug !== 'string' || postSlug.includes('..') || postSlug.includes('\\')) {
    return NextResponse.json({ error: '无效的文章路径' }, { status: 400 });
  }
  const filePath = `posts${postSlug}.md`;

  const ghResponse = await fetch(`${req.nextUrl.origin}/api/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      path: filePath,
      frontMatter: {
        title: updated.title,
        author: updated.authorName,
        date: updated.createdAt,
        tags: (updated.tags as string[]) || [],
        ...(updated.coverImage ? { cover: updated.coverImage } : {}),
        ...(updated.description ? { description: updated.description } : {}),
      },
      body: (updated.content as string) || '',
      message: `feat: publish post "${String(updated.title)}"`,
    }),
  });

  if (!ghResponse.ok) {
    const error = await ghResponse.json() as { error?: string };
    return NextResponse.json({ error: error.error ?? '发布到 GitHub 失败' }, { status: 500 });
  }

  updated.status = 'published';
  updated.slug = postSlug;
  updated.content = '';
  await db.set(`article:data:${id}`, JSON.stringify(updated));
  await db.hset('articles:published', id, JSON.stringify(updated));
  await db.hdel('articles:drafts', id);

  return NextResponse.json({ success: true, slug: postSlug });
}

async function handleDraftSave(
  body: Record<string, unknown>,
  meta: Record<string, unknown>,
  id: string,
  db: ReturnType<typeof getDb>,
): Promise<NextResponse> {
  const updated: Record<string, unknown> = {
    ...meta,
    content: body.content !== undefined ? body.content : meta.content,
    title: typeof body.title === 'string' ? body.title : meta.title,
    tags: Array.isArray(body.tags) ? body.tags : meta.tags,
    coverImage: typeof body.coverImage === 'string' ? body.coverImage : meta.coverImage,
    description: typeof body.description === 'string' ? body.description : meta.description,
    updatedAt: new Date().toISOString(),
  };

  if (updated.content) {
    await saveDraft(id, updated.content as string);
  }
  updated.content = '';
  await db.set(`article:data:${id}`, JSON.stringify(updated));
  await db.hset('articles:drafts', id, JSON.stringify(updated));

  return NextResponse.json({ success: true });
}

export const PATCH = apiHandler('PATCH', { label: '更新文章', requireAuth: true }, async (req, context, session) => {
  const id = await getParam(context, 'id');
  const body = await req.json() as Record<string, unknown>;
  logger.info('PATCH', '更新文章', { id });
  const db = getDb();
  const metaStr = await db.get(`article:data:${id}`);

  if (!metaStr) {
    logger.warn('PATCH', '文章不存在', { id });
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const meta = JSON.parse(metaStr) as Record<string, unknown>;

  if (!checkArticlePermission(meta, session!)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  if (body.status === 'published') {
    const updated = {
      ...meta,
      content: body.content !== undefined ? body.content : meta.content,
      title: typeof body.title === 'string' ? body.title : meta.title,
      tags: Array.isArray(body.tags) ? body.tags : meta.tags,
      coverImage: typeof body.coverImage === 'string' ? body.coverImage : meta.coverImage,
      description: typeof body.description === 'string' ? body.description : meta.description,
      updatedAt: new Date().toISOString(),
    };
    return handlePublishArticle(body, updated, id, req, db);
  }

  return handleDraftSave(body, meta, id, db);
});

/** 将文章移入回收站（统一入口） */
async function moveToRecycleBin(
  id: string,
  meta: Record<string, unknown>,
  db: ReturnType<typeof getDb>,
): Promise<NextResponse> {
  const deletionInfo = {
    ...meta,
    status: 'pending_deletion',
    deletionRequestedAt: new Date().toISOString(),
  };
  await db.set(`article:data:${id}`, JSON.stringify(deletionInfo));
  await db.hdel('articles:drafts', id);
  await db.hdel('articles:published', id);
  await db.hset('articles:index', id, JSON.stringify(deletionInfo));
  return NextResponse.json({ success: true, message: '已移入回收站' });
}

export const DELETE = apiHandler('DELETE', { label: '删除文章', requireAuth: true }, async (req, context, session) => {
  const id = await getParam(context, 'id');
  logger.info('DELETE', '删除文章', { id });
  const db = getDb();
  const metaStr = await db.get(`article:data:${id}`);

  // 数据库无记录 → 文件系统发布的文章，构造元数据后移入回收站
  if (!metaStr) {
    if (session!.role !== 'admin' && session!.role !== 'sudo') {
      return NextResponse.json({ error: '无权限删除此文章' }, { status: 403 });
    }
    const { getContentFile } = await import('@/lib/content');
    const slug = id.startsWith('/') ? id : `/${id}`;
    const file = getContentFile('posts', slug);
    if (!file) {
      logger.warn('DELETE', '文章不存在', { id });
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    // 为文件系统文章构造元数据，写入数据库后移入回收站
    const meta: Record<string, unknown> = {
      id,
      slug,
      title: file.meta.title,
      authorId: session!.uid,
      authorName: (file.meta.author) ?? session!.email,
      status: 'published',
      tags: file.meta.tags ?? [],
      createdAt: file.meta.date ?? new Date().toISOString(),
    };
    return moveToRecycleBin(id, meta, db);
  }

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(metaStr);
  } catch {
    logger.warn('DELETE', '文章数据解析失败', { id });
    return NextResponse.json({ error: '文章数据损坏' }, { status: 500 });
  }

  // 所有角色统一移入回收站
  if (meta.authorId !== session!.uid && session!.role !== 'admin' && session!.role !== 'sudo') {
    logger.warn('DELETE', '无权限', { id, authorId: meta.authorId, uid: session!.uid });
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  return moveToRecycleBin(id, meta, db);
});
