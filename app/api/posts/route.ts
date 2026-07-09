import { getAccessibleContent } from '@/lib/content-access';
import { getSession } from '@/lib/auth';
import { createApiLogger } from '@/lib/api-logger';

const logger = createApiLogger('/api/posts');

/**
 * 帖子列表 API — 纯文件系统读取，不查数据库
 * 仅供后台管理使用
 */
export async function GET() {
  try {
    logger.info('GET', '读取帖子列表');
    const session = await getSession();
    const isAuthenticated = !!session;
    const { files: accessibleFiles, indexes: accessibleIndexes } = await getAccessibleContent('posts');

    logger.info('GET', '帖子列表读取成功', { count: accessibleFiles.length });
    return Response.json({
      posts: accessibleFiles.map((f) => ({
        slug: f.slug,
        title: f.meta.title,
        date: f.meta.date,
        author: f.meta.author,
        tags: f.meta.tags,
        cover: f.meta.cover,
        description: f.meta.description,
      })),
      indexes: accessibleIndexes.map((idx) => ({
        slug: idx.slug,
        title: idx.title,
        description: idx.description,
        public: idx.public,
        groupName: idx.groupName,
      })),
    }, {
      // 帖子列表缓存：管理员响应不缓存，普通用户 CDN 缓存 60s
      headers: { 'Cache-Control': isAuthenticated ? 'private, no-cache' : 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    logger.error('GET', '获取帖子列表失败', { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: '获取帖子列表失败' }, { status: 500 });
  }
}
