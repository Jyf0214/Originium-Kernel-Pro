/**
 * 内容关联引用注册表
 *
 * 扫描 posts/ 和 faces/ 目录下所有 Markdown 文件，建立：
 * 1. 标题 → {slug, section} 映射，用于 [[标题]] 语法的链接解析
 * 2. 后向链接索引，用于查询"哪些内容引用了我"
 *
 * 复用 lib/content.ts 中已有的 getContentFiles() 进行文件扫描，
 * 不引入额外的文件系统操作。
 *
 * 注意：日记（diary）内容存储在数据库且经过加密，不在构建时扫描，
 * 其引用关系通过 API 在运行时动态解析。
 */

import { getContentFiles, getContentIndexes, type ContentFile } from './content';
import { canAccess } from './config';
import { hasDatabase } from './db';

/** 内容注册表条目 */
export interface RegistryEntry {
  /** 文章标题（来自 front matter） */
  title: string;
  /** 内容所属分区 */
  section: 'posts' | 'faces';
  /** URL slug（如 /daily/2024-01-15） */
  slug: string;
  /** 标签列表 */
  tags: string[];
  /** 发布日期 */
  date?: string;
}

/** 后向链接信息：谁引用了我 */
export interface BacklinkInfo {
  /** 引用来源的标题 */
  title: string;
  /** 引用来源的分区 */
  section: 'posts' | 'faces';
  /** 引用来源的 slug */
  slug: string;
  /** 来源中出现的被引用标题 */
  referencedTitles: string[];
}

/** 内部注册表结构 */
interface Registry {
  /** 标题小写 → 注册表条目 */
  titleMap: Map<string, RegistryEntry>;
  /** 所有条目 */
  entries: RegistryEntry[];
  /** 后向链接索引：`${section}:${slug}` → 来源列表 */
  backlinkIndex: Map<string, BacklinkInfo[]>;
}

/** [[标题]] 提取正则 */
const WIKI_LINK_RE = /\[\[([^\[\]]+?)\]\]/g;

/**
 * 从文本中提取所有 [[标题]] 引用
 */
export function extractWikiLinks(content: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKI_LINK_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    const captured = match[1];
    if (captured) results.push(captured.trim());
  }
  return results;
}

/**
 * 构建内容注册表（扫描 posts + faces）
 *
 * 复用 getContentFiles() 获取已解析的 ContentFile[],
 * 从中提取标题、slug、标签等信息建立索引。
 */
function buildRegistry(): Registry {
  const titleMap = new Map<string, RegistryEntry>();
  const entries: RegistryEntry[] = [];

  const sections = ['posts', 'faces'] as const;

  // 预取各分区的文件列表，复用同一数组避免重复 getContentFiles() 调用
  const filesBySection = new Map<'posts' | 'faces', ContentFile[]>();
  for (const section of sections) {
    filesBySection.set(section, getContentFiles(section));
  }

  for (const section of sections) {
    const files = filesBySection.get(section)!;
    for (const file of files) {
      const entry: RegistryEntry = {
        title: file.meta.title,
        section,
        slug: file.slug,
        tags: Array.isArray(file.meta.tags) ? file.meta.tags : [],
        date: file.meta.date,
      };
      entries.push(entry);
      titleMap.set(file.meta.title.toLowerCase(), entry);
    }
  }

  // 构建后向链接索引
  const backlinkIndex = new Map<string, BacklinkInfo[]>();

  for (const entry of entries) {
    const files = filesBySection.get(entry.section);
    const file = files?.find((f) => f.slug === entry.slug);
    if (!file) continue;

    const refTitles = extractWikiLinks(file.content);
    if (refTitles.length === 0) continue;

    for (const refTitle of refTitles) {
      const target = titleMap.get(refTitle.toLowerCase());
      if (!target) continue;
      // 跳过自引用
      if (entry.section === target.section && entry.slug === target.slug) continue;

      const targetKey = `${target.section}:${target.slug}`;
      const existing = backlinkIndex.get(targetKey);

      if (existing) {
        const already = existing.some(
          (b) => b.section === entry.section && b.slug === entry.slug,
        );
        if (!already) {
          existing.push({
            title: entry.title,
            section: entry.section,
            slug: entry.slug,
            referencedTitles: refTitles.filter(
              (r) => r.toLowerCase() === refTitle.toLowerCase(),
            ),
          });
        }
      } else {
        backlinkIndex.set(targetKey, [
          {
            title: entry.title,
            section: entry.section,
            slug: entry.slug,
            referencedTitles: refTitles.filter(
              (r) => r.toLowerCase() === refTitle.toLowerCase(),
            ),
          },
        ]);
      }
    }
  }

  return { titleMap, entries, backlinkIndex };
}

// ---------- 缓存管理 ----------

let cached: Registry | null = null;
let cacheTs = 0;
const CACHE_TTL = process.env.NODE_ENV === 'development' ? 0 : 5 * 60 * 1000;

/** 获取注册表（带缓存） */
export function getContentRegistry(): Registry {
  const now = Date.now();
  if (cached && now - cacheTs < CACHE_TTL) return cached;
  cached = buildRegistry();
  cacheTs = now;
  return cached;
}

/** 清除注册表缓存 */
export function clearContentRegistry(): void {
  cached = null;
  cacheTs = 0;
}

// ---------- 对外 API ----------

/**
 * 根据标题解析 wiki-link → 对应 URL
 * @returns 解析结果，未找到返回 null
 */
export function resolveWikiLink(
  title: string,
): { url: string; title: string; section: 'posts' | 'faces' } | null {
  const reg = getContentRegistry();
  const entry = reg.titleMap.get(title.toLowerCase());
  if (!entry) return null;

  const url =
    entry.section === 'posts'
      ? `/posts${entry.slug}`
      : `/faces${entry.slug}`;

  return { url, title: entry.title, section: entry.section };
}

/**
 * 获取指定内容的后向链接（谁引用了我）
 */
export function getBacklinks(
  section: 'posts' | 'faces',
  slug: string,
): BacklinkInfo[] {
  const reg = getContentRegistry();
  return reg.backlinkIndex.get(`${section}:${slug}`) ?? [];
}

/**
 * 获取指定内容的出向引用（我引用了谁）
 */
export function getOutgoingReferences(
  section: 'posts' | 'faces',
  slug: string,
): RegistryEntry[] {
  const reg = getContentRegistry();
  const files = getContentFiles(section);
  const file = files.find((f) => f.slug === slug);
  if (!file) return [];

  const refTitles = extractWikiLinks(file.content);
  const results: RegistryEntry[] = [];
  const seen = new Set<string>();

  for (const title of refTitles) {
    const entry = reg.titleMap.get(title.toLowerCase());
    if (entry) {
      const key = `${entry.section}:${entry.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(entry);
      }
    }
  }

  return results;
}

/**
 * 构建 WikiLinkMap（小写标题 → {url, title}）
 *
 * 用于传递给客户端 MarkdownRenderer，
 * 在客户端完成 [[标题]] → 链接的预处理。
 *
 * 过滤不可公开访问的条目：
 * - 目录级私有（index.md 标记 public: false，isPrivateSlug 判定）
 * - config.yaml access 规则判定为不可访问的内容（如 faces 全私有）
 * 避免 [[标题]] 链接导出私有内容的路径与标题。
 *
 * @returns JSON 安全的映射对象，可直接序列化到 props
 */
export async function buildWikiLinkMap(): Promise<Record<string, { url: string; title: string }>> {
  const reg = getContentRegistry();
  // 目录索引：slug → public 标记，用于过滤目录级私有的条目
  const indexPublic = new Map<string, boolean>();
  for (const idx of getContentIndexes('posts')) {
    indexPublic.set(idx.slug, idx.public);
    indexPublic.set('/posts' + idx.slug, idx.public);
  }
  for (const idx of getContentIndexes('faces')) {
    indexPublic.set(idx.slug, idx.public);
    indexPublic.set('/faces' + idx.slug, idx.public);
  }

  const map: Record<string, { url: string; title: string }> = {};
  const pending: { lowerTitle: string; entry: RegistryEntry }[] = [];

  for (const [lowerTitle, entry] of reg.titleMap) {
    // 目录级私有：slug 所在目录的 index.md 标记 public:false
    const dirSlug = '/' + entry.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const isDirPrivate = indexPublic.get(dirSlug) === false;
    if (isDirPrivate) continue;
    pending.push({ lowerTitle, entry });
  }

  // config.yaml access 规则过滤（async，构建期与 API 运行时均按 hasDatabase 判定）
  const accessResults = await Promise.all(
    pending.map(async ({ entry }) =>
      canAccess(entry.section, entry.slug, false, hasDatabase()),
    ),
  );

  for (let i = 0; i < pending.length; i++) {
    if (!accessResults[i]) continue;
    const item = pending[i];
    if (!item) continue;
    const { lowerTitle, entry } = item;
    const url =
      entry.section === 'posts'
        ? `/posts${entry.slug}`
        : `/faces${entry.slug}`;
    map[lowerTitle] = { url, title: entry.title };
  }

  return map;
}
