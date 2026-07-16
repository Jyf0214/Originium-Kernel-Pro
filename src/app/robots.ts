import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/const/url';

export const dynamic = 'force-static';

/**
 * robots.txt 配置
 *
 * 允许全部爬虫访问公开内容，禁止抓取后台、鉴权与编辑类路由。
 * sitemap 必须使用绝对 URL，从 getSiteUrl() 派生。
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/dashboard',
        '/api',
        '/diary',
        '/tickets',
        '/editor',
        '/page/private*',
        '/files/*',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
