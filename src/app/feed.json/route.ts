import { type NextRequest, NextResponse } from 'next/server';
import {
  getPublicPosts,
  getFeedConfig,
  FEED_ITEM_LIMIT,
} from '@/lib/feed';

/**
 * JSON Feed 1.1 订阅源
 *
 * 路由：/feed.json
 * 规范：https://www.jsonfeed.org/version/1.1/
 * 数据源：posts 目录下全部公开的 Markdown 文件
 * 内容：按日期降序最多 20 篇
 */
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const { siteUrl, title, description } = await getFeedConfig();
  const allPosts = getPublicPosts();
  const recentPosts = allPosts.slice(0, FEED_ITEM_LIMIT);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    description,
    home_page_url: siteUrl,
    feed_url: `${siteUrl}/feed.json`,
    items: recentPosts.map((post) => ({
      id: `${siteUrl}/posts${post.slug}`,
      url: `${siteUrl}/posts${post.slug}`,
      title: post.meta.title,
      summary: post.meta.description ?? '',
      date_published: post.meta.date ?? new Date().toISOString(),
      tags: post.meta.tags,
      author: post.meta.author
        ? { name: post.meta.author }
        : undefined,
    })),
  };

  const json = JSON.stringify(feed, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
