import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { apiHandler } from '@/lib/api-handler';
import { createApiLogger } from '@/lib/api-logger';
import { checkRateLimit } from '@/lib/rate-limit';

const logger = createApiLogger('/api/navigation');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NavigationNode {
  /** 目录的 slug（相对于 posts 的路径，如 "daily/2024"） */
  slug: string;
  /** 目录标题（从 frontmatter title 字段读取，默认为目录名） */
  title: string;
  /** 目录描述 */
  description: string;
  /** 图标名称 */
  icon: string;
  /** 排序权重，越小越靠前，未设置的排在最后 */
  order: number;
  /** 是否公开 */
  public: boolean;
  /** 子目录节点 */
  children: NavigationNode[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const POSTS_DIR = path.join(process.cwd(), 'posts');

/**
 * 递归扫描目录，构建导航树
 * 仅读取含 index.md 的子目录，frontmatter 中 public !== false 的目录才会被收录
 */
function buildNavigationTree(dir: string, relativeBase: string): NavigationNode[] {
  if (!fs.existsSync(dir)) return [];

  const nodes: NavigationNode[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);
    const indexFile = path.join(fullPath, 'index.md');

    if (!fs.existsSync(indexFile)) continue;

    let raw: string;
    try {
      raw = fs.readFileSync(indexFile, 'utf-8');
    } catch {
      continue;
    }

    let data: Record<string, unknown>;
    try {
      ({ data } = matter(raw));
    } catch {
      continue;
    }

    // 未显式设置 public 或 public 为 false 的目录不收录
    const isPublic = data.public === true;
    if (!isPublic) continue;

    const slug = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

    const children = buildNavigationTree(fullPath, slug);

    nodes.push({
      slug,
      title: String(data.title ?? entry.name),
      description: String(data.description ?? ''),
      icon: String(data.icon ?? ''),
      order: typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
      public: true,
      children,
    });
  }

  // 排序：order 升序，未设置的排最后，同 order 按 title 字母排序
  nodes.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  return nodes;
}

// ─── API Route ──────────────────────────────────────────────────────────────

function checkNavigationRateLimit(req: NextRequest): NextResponse | null {
  const rl = checkRateLimit(req, 'navigation', 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
  }
  return null;
}

export const GET = apiHandler('GET', { label: '导航目录' }, (req: NextRequest) => {
  const rlErr = checkNavigationRateLimit(req);
  if (rlErr) return rlErr;

  logger.info('GET', '读取导航目录树');

  const tree = buildNavigationTree(POSTS_DIR, '');

  return NextResponse.json({ tree });
});
