import type { MetadataRoute } from 'next';
import { getContentFiles, getContentIndexes, filterPublicFiles } from '@/lib/content';
import { getSiteUrl } from '@/const/url';

export const dynamic = 'force-static';

/**
 * 站点地图
 *
 * 包含：
 * - 静态页面（首页、帖子列表、通讯录、关于、归档）
 * - 全部公开帖子的详情页
 *
 * 私有帖子（目录 index.md / index.tsx 中 `public: false`）不收录，
 * hidden 文章不收录，
 * 避免搜索爬虫抓取到需要鉴权或不公开的内容。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/posts`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/faces`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/archives`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 过滤公开且未隐藏的文章（与首页、帖子列表页保持一致）
  const postPages: MetadataRoute.Sitemap = filterPublicFiles(allFiles, indexes)
    .map((file) => ({
      url: `${siteUrl}/posts${file.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  return [...staticPages, ...postPages];
}
