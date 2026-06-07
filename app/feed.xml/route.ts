import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig } from '@/lib/config';
import { getSiteUrl } from '@/const/url';

/**
 * RSS 2.0 Feed
 *
 * 路由：/feed.xml
 * 数据源：posts 目录下全部公开的 Markdown 文件
 * 内容：按日期降序最多 20 篇，标题、链接、发布日期、摘要、guid
 *
 * 站点元信息（标题/描述/语言）从 config.yaml 的 site 段读取，
 * 与首页 metadata 保持一致。
 */
export const dynamic = 'force-static';
export const revalidate = false;

const FEED_ITEM_LIMIT = 20;

export function GET(_request: NextRequest): NextResponse {
  const siteUrl = getSiteUrl();
  const config = loadConfig();

  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅保留公开目录下的帖子
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    return dirIndex ? dirIndex.public : true;
  });

  // 最近 FEED_ITEM_LIMIT 篇（getContentFiles 已按日期降序）
  const recentFiles = publicFiles.slice(0, FEED_ITEM_LIMIT);

  const lastBuildDate = recentFiles[0]?.meta.date
    ? toRfc822(recentFiles[0].meta.date)
    : new Date().toUTCString();

  const itemsXml = recentFiles
    .map((file) => buildItemXml(file, siteUrl))
    .join('\n');

  const channelTitle = config.site.title;
  const channelDescription = config.site.description;
  const channelLanguage = config.site.lang || 'zh-CN';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${escapeXml(channelLanguage)}</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function buildItemXml(
  file: { slug: string; meta: { title: string; date?: string; description?: string }; content: string },
  siteUrl: string,
): string {
  const link = `${siteUrl}/posts${file.slug}`;
  const title = file.meta.title || path.basename(file.slug);
  const description = (file.meta.description ?? stripMarkdown(file.content)).slice(0, 200);
  const pubDate = toRfc822(file.meta.date);
  const guid = file.slug;

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
}

function toRfc822(input: string | undefined): string {
  if (!input) return new Date().toUTCString();
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 极简 Markdown 剥离：用于从正文生成 RSS description 的兜底摘要
 * 不追求完美，仅去除明显影响 RSS 阅读体验的语法标记
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[#>*_~\-]+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
