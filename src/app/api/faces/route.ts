import { type NextRequest, NextResponse } from 'next/server';
import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig, canAccess, hasDatabase } from '@/lib/config';
import { type SessionPayload, getSession, isRootRole, getSessionWithKeyId, requireApiKeyPermission } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';
import { rateLimit } from '@/lib/rate-limit';
import { getEnvConfig } from '@/lib/env';
import { getFileFromGithub, updateFileInGithub, deleteFileFromGithub, composeFileContent } from '@/lib/github';
import { logAudit } from '@/lib/audit';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/faces');

/**
 * API 密钥细粒度权限检查（通讯录读写）
 * Cookie 认证(浏览器)直接通过；密钥认证检查 posts_* 权限
 */
async function requireFacesPerm(action: 'posts_read' | 'posts_write'): Promise<NextResponse | null> {
  const authResult = await getSessionWithKeyId();
  if (!authResult) return null;
  return requireApiKeyPermission(authResult.session, authResult.currentKeyId, action);
}

/** 单个文件的访问权限检查 */
async function isFileAccessible(
  file: { slug: string; meta: Record<string, unknown> },
  isAdmin: boolean,
  isAuthenticated: boolean,
  dbAvailable: boolean,
  config: Awaited<ReturnType<typeof loadConfig>>,
): Promise<boolean> {
  if (isAdmin) return true;
  const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
  return (
    await canAccess('faces', file.slug, isAuthenticated, dbAvailable, config)
    && await canAccess('faces', dirSlug || '/', isAuthenticated, dbAvailable, config)
    && file.meta.public === true
  );
}

/**
 * 通讯录列表 API
 * 根据认证状态和数据库可用性返回可访问的通讯录条目
 */
export async function GET() {
  try {
    // API 密钥认证的请求需 posts_read 权限
    const denied = await requireFacesPerm('posts_read');
    if (denied) return denied;

    const config = await loadConfig();
    const session = await getSession();
    const isAuthenticated = !!session;
    const dbAvailable = hasDatabase();
    const allFiles = getContentFiles('faces');
    const indexes = getContentIndexes('faces');
    const isAdmin = session?.role === 'admin' || isRootRole(session?.role);

  logger.info('GET', '读取通讯录列表');

  const accessibleFiles: typeof allFiles = [];
  for (const file of allFiles) {
    if (await isFileAccessible(file, isAdmin, isAuthenticated, dbAvailable, config)) {
      accessibleFiles.push(file);
    }
  }

  const accessibleIndexes: typeof indexes = [];
  for (const idx of indexes) {
    if (isAdmin) { accessibleIndexes.push(idx); continue; }
    const allowed = await canAccess('faces', idx.slug, isAuthenticated, dbAvailable, config) && idx.public;
    if (allowed) accessibleIndexes.push(idx);
  }

  logger.info('GET', '通讯录列表读取成功', { count: accessibleFiles.length });
  return NextResponse.json({
    faces: accessibleFiles.map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      tags: f.meta.tags ?? [],
      description: f.meta.description,
    })),
    indexes: accessibleIndexes.map((idx) => ({
      slug: idx.slug,
      title: idx.title,
      description: idx.description,
      public: idx.public,
      groupName: idx.groupName,
    })),
    site: config.site,
    }, {
      // 通讯录内容随登录态变化（私有规则），禁止 CDN 共享缓存，
      // 否则登录用户的数据会缓存给未登录用户（泄露）或反之
      headers: {
        'Cache-Control': 'private, no-cache, no-store',
        'Vary': 'Cookie',
      },
    });
  } catch (error) {
    logger.error('GET', '获取通讯录列表失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.fetchListFailed') }, { status: 500 });
  }
}

/**
 * 检查用户是否有权限管理指定联系人
 */
function canManageFace(session: SessionPayload | null): boolean {
  if (!session) return false;
  return session.role === 'admin' || isRootRole(session.role);
}

/**
 * 生成文件 slug（从姓名生成）
 */
function generateSlug(name: string): string {
  // 简单处理：移除特殊字符，保留中文、字母、数字，用连字符替换空格
  return name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || name;
}

/**
 * 从 GitHub 读取文件内容和元数据
 */
async function getFileFromGitHub(filePath: string): Promise<{ sha: string; email: string; raw: string } | null> {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) return null;
  const fileData = await getFileFromGithub(env.githubRepo, env.githubToken, filePath);
  if (!fileData) return null;
  const matter = await import('gray-matter');
  const { data: frontMatter } = matter.default(fileData.content);
  return {
    sha: fileData.sha,
    email: typeof frontMatter.email === 'string' ? frontMatter.email : '',
    raw: fileData.content,
  };
}

/**
 * 校验姓名和分组，防止路径穿越攻击
 * 返回 null 表示通过，否则返回错误 Response
 */
function validateNameAndGroup(name: string, group: string): NextResponse | null {
  if (!name || !group) {
    return NextResponse.json({ error: getTranslate('api.faces.nameAndGroupRequired') }, { status: 400 });
  }
  if (/[.\/\\]/.test(group)) {
    return NextResponse.json({ error: getTranslate('api.faces.invalidGroupName') }, { status: 400 });
  }
  if (/[.\/\\]/.test(name)) {
    return NextResponse.json({ error: getTranslate('api.faces.invalidName') }, { status: 400 });
  }
  return null;
}

/**
 * 创建联系人
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && !isRootRole(session.role))) {
    logger.warn('POST', '无权限', { role: session?.role });
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }

  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireFacesPerm('posts_write');
  if (denied) return denied;

  const rl = rateLimit(`${session.uid}:faces-write`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: getTranslate('api.common.rateLimited') }, { status: 429 });
  }

  try {
    const resp = await handleCreateContact(req);
    if (!resp.ok) {
      void logAudit('face_create_failed', 'faces', '创建联系人失败', session.uid);
    } else {
      void logAudit('face_create', 'faces', '创建联系人', session.uid);
    }
    return resp;
  } catch (error: unknown) {
    logger.error('POST', '创建联系人失败', { error: error instanceof Error ? error.message : String(error) });
    void logAudit('face_create_failed', 'faces', '创建联系人失败', session.uid);
    return NextResponse.json({ error: getTranslate('api.faces.createFailed') }, { status: 500 });
  }
}

/** 执行创建联系人（含输入校验与 GitHub 写入） */
async function handleCreateContact(req: NextRequest): Promise<NextResponse> {
  logger.info('POST', '创建联系人');
  const { name, email, phone, group, content } = await req.json();

  const validationError = validateNameAndGroup(name, group);
  if (validationError) {
    logger.warn('POST', '输入校验失败');
    return validationError;
  }

  const slug = generateSlug(name);
  const filePath = `faces/${group}/${slug}.md`;
  const now = new Date().toISOString();

  const frontMatter = {
    title: name,
    name,
    email: email ?? '',
    phone: phone ?? '',
    group,
    date: now,
  };

  const message = `feat: add contact "${name}"`;

  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('POST', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }

  try {
    await updateFileInGithub({
      repo: env.githubRepo,
      token: env.githubToken,
      path: filePath,
      content: await composeFileContent(undefined, frontMatter, content ?? ''),
      message,
    });
  } catch (error: unknown) {
    logger.error('POST', '创建联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.createFailed') }, { status: 500 });
  }

  logger.info('POST', '联系人创建成功', { slug: `/${group}/${slug}` });
  return NextResponse.json({ success: true, slug: `/${group}/${slug}` });
}

/**
 * 构建联系人 frontMatter
 */
function buildFrontMatter(
  name: string,
  email: string | undefined,
  phone: string | undefined,
  group: string,
  date: string,
): Record<string, unknown> {
  return {
    title: name,
    name,
    email: email ?? '',
    phone: phone ?? '',
    group,
    date,
  };
}

/**
 * 处理联系人重命名（路径变更）：创建新文件 + 删除旧文件
 */
async function handleRenameContact(
  opts: {
    name: string;
    group: string;
    newSlug: string;
    newFilePath: string;
    oldFilePath: string;
    frontMatter: Record<string, unknown>;
    content: string;
  },
) {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('PATCH', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }

  try {
    await updateFileInGithub({
      repo: env.githubRepo,
      token: env.githubToken,
      path: opts.newFilePath,
      content: await composeFileContent(undefined, opts.frontMatter, opts.content),
      message: `update: move contact "${opts.name}" to ${opts.newFilePath}`,
    });
  } catch (error: unknown) {
    logger.error('PATCH', '创建新联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.updateFailed') }, { status: 500 });
  }

  try {
    await deleteFileFromGithub(env.githubRepo, env.githubToken, opts.oldFilePath);
  } catch (error: unknown) {
    logger.error('PATCH', '删除旧文件失败，联系人可能出现重复', { oldFilePath: opts.oldFilePath, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.renameFailed') }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug: `/${opts.group}/${opts.newSlug}` });
}

/**
 * 处理联系人原地更新（路径不变）
 */
async function handleUpdateContact(
  opts: {
    name: string;
    group: string;
    newSlug: string;
    oldFilePath: string;
    frontMatter: Record<string, unknown>;
    content: string;
  },
) {
  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('PATCH', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }

  try {
    await updateFileInGithub({
      repo: env.githubRepo,
      token: env.githubToken,
      path: opts.oldFilePath,
      content: await composeFileContent(undefined, opts.frontMatter, opts.content),
      message: `update: update contact "${opts.name}"`,
    });
  } catch (error: unknown) {
    logger.error('PATCH', '更新联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.updateFailed') }, { status: 500 });
  }

  logger.info('PATCH', '更新联系人成功', { slug: `/${opts.group}/${opts.newSlug}` });
  return NextResponse.json({ success: true, slug: `/${opts.group}/${opts.newSlug}` });
}

/**
 * 校验 PATCH 请求输入
 */
function validatePatchInput(body: Record<string, unknown>): NextResponse | null {
  if (!body.slug) {
    logger.warn('PATCH', '缺少联系人路径');
    return NextResponse.json({ error: getTranslate('api.faces.missingSlug') }, { status: 400 });
  }
  if (!/^\/[\w-]+\/[\w-]+$/.test(String(body.slug)) || /\.\./.test(String(body.slug))) {
    return NextResponse.json({ error: getTranslate('api.faces.invalidSlug') }, { status: 400 });
  }
  if (!body.name || !body.group) {
    logger.warn('PATCH', '缺少必填字段');
    return NextResponse.json({ error: getTranslate('api.faces.nameAndGroupRequired') }, { status: 400 });
  }
  return null;
}

/**
 * 更新联系人
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!canManageFace(session)) {
    logger.warn('PATCH', '无权限', { role: session?.role });
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }

  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireFacesPerm('posts_write');
  if (denied) return denied;

  if (session) {
    const rl = rateLimit(`${session.uid}:faces-write`, 30, 60 * 1000);
    if (!rl.allowed) return NextResponse.json({ error: getTranslate('api.common.rateLimited') }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: getTranslate('api.faces.invalidRequestFormat') }, { status: 400 });
  }
  const patchErr = validatePatchInput(body);
  if (patchErr) return patchErr;

  const resp = await handlePatchContact(req, body);
  if (!resp.ok) {
    void logAudit('face_update_failed', 'faces', `更新联系人失败：${String(body.slug ?? '')}`, session?.uid ?? 'unknown');
  } else {
    void logAudit('face_update', 'faces', `更新联系人：${String(body.slug ?? '')}`, session?.uid ?? 'unknown');
  }
  return resp;
}

async function handlePatchContact(req: NextRequest, body: Record<string, unknown>): Promise<NextResponse> {
  try {
    const slug = String(body.slug);
    const name = String(body.name);
    const email = String(body.email ?? '');
    const phone = String(body.phone ?? '');
    const group = String(body.group);
    const content = body.content !== undefined && body.content !== null ? String(body.content) : undefined;

    const oldFilePath = `faces${slug}.md`;
    const fileData = await getFileFromGitHub(oldFilePath);
    if (!fileData) {
      logger.warn('PATCH', '联系人不存在', { slug });
      return NextResponse.json({ error: getTranslate('api.faces.contactNotFound') }, { status: 404 });
    }

    const newSlug = generateSlug(name);
    const newFilePath = `faces/${group}/${newSlug}.md`;
    const frontMatter = buildFrontMatter(name, email, phone, group, new Date().toISOString());

    if (newFilePath !== oldFilePath) {
      return handleRenameContact({ name, group, newSlug, newFilePath, oldFilePath, frontMatter, content: content ?? '' });
    }
    return handleUpdateContact({ name, group, newSlug, oldFilePath, frontMatter, content: content ?? '' });
  } catch (error: unknown) {
    logger.error('PATCH', '更新联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.updateFailed') }, { status: 500 });
  }
}

/**
 * 删除联系人
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && !isRootRole(session.role))) {
    logger.warn('DELETE', '无权限', { role: session?.role });
    return NextResponse.json({ error: getTranslate('api.common.unauthorized') }, { status: 403 });
  }

  // API 密钥认证的请求需 posts_write 权限
  const denied = await requireFacesPerm('posts_write');
  if (denied) return denied;

  const rl = rateLimit(`${session.uid}:faces-write`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: getTranslate('api.common.rateLimited') }, { status: 429 });
  }

  try {
    const resp = await handleDeleteContact(req, session);
    if (!resp.ok) {
      void logAudit('face_delete_failed', 'faces', '删除联系人失败', session.uid);
    } else {
      void logAudit('face_delete', 'faces', '删除联系人', session.uid);
    }
    return resp;
  } catch (error: unknown) {
    logger.error('DELETE', '删除联系人失败', { error: error instanceof Error ? error.message : String(error) });
    void logAudit('face_delete_failed', 'faces', '删除联系人失败', session.uid);
    return NextResponse.json({ error: getTranslate('api.faces.deleteFailed') }, { status: 500 });
  }
}

/** 执行删除联系人（含 slug 校验与 GitHub 删除） */
async function handleDeleteContact(req: NextRequest, session: SessionPayload): Promise<NextResponse> {
  const { slug } = await req.json();

  if (!slug) {
    logger.warn('DELETE', '缺少联系人路径');
    return NextResponse.json({ error: getTranslate('api.faces.missingSlug') }, { status: 400 });
  }

  // 防止路径穿越攻击：slug 必须是 /group/name 格式
  if (!/^\/[\w-]+\/[\w-]+$/.test(slug) || /\.\./.test(slug)) {
    return NextResponse.json({ error: getTranslate('api.faces.invalidSlug') }, { status: 400 });
  }

  const filePath = `faces${slug}.md`;

  // 从 GitHub 直接读取文件（内部直调，不走 HTTP 端点）
  const fileData = await getFileFromGitHub(filePath);
  if (!fileData) {
    logger.warn('DELETE', '联系人不存在', { slug });
    return NextResponse.json({ error: getTranslate('api.faces.contactNotFound') }, { status: 404 });
  }

  if (!canManageFace(session)) {
    logger.warn('DELETE', '无权删除联系人', { slug });
    return NextResponse.json({ error: getTranslate('api.faces.noDeletePermission') }, { status: 403 });
  }

  const env = getEnvConfig();
  if (!env.githubRepo || !env.githubToken) {
    logger.error('DELETE', 'GitHub 配置缺失');
    return NextResponse.json({ error: getTranslate('api.github.missingConfig') }, { status: 500 });
  }

  try {
    await deleteFileFromGithub(env.githubRepo, env.githubToken, filePath);
  } catch (error: unknown) {
    logger.error('DELETE', '删除联系人失败', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: getTranslate('api.faces.deleteFailed') }, { status: 500 });
  }

  logger.info('DELETE', '删除联系人成功', { slug });
  return NextResponse.json({ success: true });
}
