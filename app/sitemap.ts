import type { MetadataRoute } from 'next';
import { getAllSlugs, getContentIndexes } from '@/lib/content';
import { getSiteUrl } from '@/const/url';

/**
 * 站点地图
 *
 * 包含：
 * - 静态页面（首页、帖子列表、通讯录、关于、归档）
 * - 全部公开帖子的详情页
 *
 * 私有帖子（目录 index.md / index.tsx 中 `public: false`）不收录，
 * 避免搜索爬虫抓取到需要鉴权的内容。
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

  const postSlugs = getAllSlugs('posts');
  const indexes = getContentIndexes('posts');

  const postPages: MetadataRoute.Sitemap = postSlugs
    .filter((slug) => isPublicPostSlug(slug, indexes))
    .map((slug) => ({
      url: `${siteUrl}/posts${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

  return [...staticPages, ...postPages];
}

/**
 * 判断帖子所在目录是否标记为 public
 * 与 app/posts/[...slug]/_lib/post-utils.ts 中的 isPrivateSlug 保持一致
 */
function isPublicPostSlug(
  slug: string,
  indexes: { slug: string; public: boolean }[],
): boolean {
  const dirSlug = '/' + slug.split('/').filter(Boolean).slice(0, -1).join('/');
  const dirIndex = indexes.find(
    (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
  );
  return dirIndex ? dirIndex.public : true;
}
