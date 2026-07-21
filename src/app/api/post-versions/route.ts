/**
 * ⚠️ 警告：此文件是动态 API 路由
 *
 * 绝对不要在此文件中添加 `export const dynamic = 'force-static'` 或 `export const revalidate = false`。
 * API 路由天然是动态的，静态导出模式下通过 filter-db-routes.mjs 脚本整体移除，
 * 而不是通过 Next.js 的 dynamic 导出使其"静态化"。
 *
 * 新增 API 路由时，必须同步更新 scripts/filter-db-routes.mjs 的 DB_ROUTE_PATHS 列表，
 * 否则静态导出构建会失败。
 *
 * 帖子版本历史 API
 *
 * GET /api/post-versions?slug=xxx — 获取指定文章的版本列表
 * GET /api/post-versions?slug=xxx&versionId=yyy — 获取单个版本详情
 *
 * 仅在 SSR 模式下可用（静态导出模式下不会被调用）
 * 使用 KV 存储管理版本数据，无需额外数据库模型
 */
import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { getDb } from '@/lib/db';

/** 版本列表最大返回数 */
const MAX_VERSIONS = 20;

/** 版本摘要（不含内容明文，用于列表展示） */
interface VersionSummary {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
}

/**
 * 从 KV 存储读取指定文章的版本 ID 列表
 * 键格式：post-versions:{slug} → JSON 数组（按时间倒序）
 */
async function getVersionIds(slug: string): Promise<string[]> {
  const db = getDb();
  const raw = await db.get(`post-versions:${slug}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * 从 KV 存储读取单个版本元数据（不含正文内容）
 */
async function getVersionMeta(versionId: string): Promise<VersionSummary | null> {
  const db = getDb();
  const raw = await db.get(`post-version:${versionId}:meta`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VersionSummary;
  } catch {
    return null;
  }
}

/**
 * 从 KV 存储读取单个版本的正文内容
 */
async function getVersionContent(versionId: string): Promise<string | null> {
  const db = getDb();
  return db.get(`post-version:${versionId}:content`);
}

export const GET = apiHandler(
  'GET',
  { label: '帖子版本历史', requireAuth: false },
  async (req) => {
    const slug = req.nextUrl.searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
    }

    const versionId = req.nextUrl.searchParams.get('versionId');

    // 请求单个版本详情
    if (versionId) {
      const meta = await getVersionMeta(versionId);
      if (meta?.slug !== slug) {
        return NextResponse.json({ error: '版本不存在' }, { status: 404 });
      }
      const content = await getVersionContent(versionId);
      return NextResponse.json({
        version: { ...meta, content: content ?? '' },
      });
    }

    // 请求版本列表
    const versionIds = await getVersionIds(slug);
    const versions: VersionSummary[] = [];

    for (const id of versionIds.slice(0, MAX_VERSIONS)) {
      const meta = await getVersionMeta(id);
      if (meta) versions.push(meta);
    }

    return NextResponse.json({ versions });
  },
);
