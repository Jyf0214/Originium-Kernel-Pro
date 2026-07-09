/**
 * 内容访问过滤工具
 *
 * 提供统一的"获取内容文件 + 按权限过滤"逻辑,
 * 供 /api/posts 和 /api/articles 等路由共享使用,
 * 避免每个路由重复实现 session + config + canAccess 过滤链。
 */
import { getSession } from '@/lib/auth';
import { loadConfig, canAccess, hasDatabase } from '@/lib/config';
import { getContentFiles, getContentIndexes, filterPublicFiles } from '@/lib/content';
import type { ContentFile, ContentIndex } from '@/types/content';

/** 过滤后的内容文件 + 索引结果 */
export interface FilteredContent {
  files: ContentFile[];
  indexes: ContentIndex[];
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
  const config = loadConfig();
  const dbAvailable = hasDatabase();

  const allFiles = getContentFiles(section);
  const indexes = getContentIndexes(section);

  const files = filterPublicFiles(allFiles, indexes)
    .filter((f) => canAccess(section, f.slug, isAuthenticated, dbAvailable, config));

  const accessibleIndexes = indexes.filter((idx) =>
    canAccess(section, idx.slug, isAuthenticated, dbAvailable, config)
  );

  return { files, indexes: accessibleIndexes };
}
