/**
 * 内容访问过滤工具
 *
 * 提供统一的"获取内容文件 + 按权限过滤"逻辑,
 * 供 /api/posts 和 /api/articles 等路由共享使用,
 * 避免每个路由重复实现 session + config + canAccess 过滤链。
 */
import { getSession } from '@/lib/auth';
import { loadConfig, hasDatabase, matchPath, type AppConfig } from '@/lib/config';
import { getContentFiles, getContentIndexes, filterPublicFiles } from '@/lib/content';
import type { ContentFile, ContentIndex } from '@/types/content';

/** 过滤后的内容文件 + 索引结果 */
export interface FilteredContent {
  files: ContentFile[];
  indexes: ContentIndex[];
}

/**
 * 同步版本的访问检查（避免循环内 await 异步函数的 microtask 开销）
 * 逻辑与 config.ts 中 canAccess 一致，仅在 config 已加载的前提下使用
 */
function canAccessSync(
  section: 'posts' | 'faces' | 'diary',
  slug: string,
  isAuthenticated: boolean,
  hasDb: boolean,
  config: AppConfig,
): boolean {
  const rules = config.access[section];
  const isPrivate = rules.private.some((p: string) => matchPath(p, slug));
  const isPublic = rules.public.some((p: string) => matchPath(p, slug));

  if (isPrivate && !hasDb) return false;
  if (isPrivate && hasDb) return isAuthenticated;
  if (isPublic) return true;
  return isAuthenticated;
}

/**
 * 获取指定分区的内容文件和索引,并按当前用户权限过滤。
 *
 * @param section - 内容分区('posts' | 'faces' | 'diary')
 * @returns 过滤后的文件和索引列表
 */
export async function getAccessibleContent(
  section: 'posts' | 'faces' | 'diary' = 'posts',
): Promise<FilteredContent> {
  const session = await getSession();
  const isAuthenticated = !!session;
  const config = await loadConfig();
  const dbAvailable = hasDatabase();

  const allFiles = getContentFiles(section);
  const indexes = getContentIndexes(section);

  const files = filterPublicFiles(allFiles, indexes);
  const accessibleFiles = [];
  for (const f of files) {
    if (canAccessSync(section, f.slug, isAuthenticated, dbAvailable, config)) {
      accessibleFiles.push(f);
    }
  }

  const accessibleIndexes = [];
  for (const idx of indexes) {
    if (canAccessSync(section, idx.slug, isAuthenticated, dbAvailable, config)) {
      accessibleIndexes.push(idx);
    }
  }

  return { files: accessibleFiles, indexes: accessibleIndexes };
}
