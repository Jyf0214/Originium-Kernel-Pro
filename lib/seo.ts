import type { Metadata } from 'next';
import { getSiteUrl } from '@/const/url';

/** 默认站点标题 */
const DEFAULT_SITE_TITLE = 'Originium Kernel';

/** 获取站点标题 */
function getSiteTitle(siteTitle?: string): string {
  return siteTitle ?? DEFAULT_SITE_TITLE;
}

/** 生成帖子页面的完整 SEO Metadata */
export function buildPostMetadata(opts: {
  title: string;
  description?: string;
  slug: string;
  cover?: string;
  date?: string;
  author?: string;
  tags?: string[];
  siteTitle?: string;
  siteUrl?: string;
}): Metadata {
  const siteUrl = opts.siteUrl ?? getSiteUrl();
  const siteTitle = getSiteTitle(opts.siteTitle);
  const fullTitle = opts.title ? `${opts.title} - ${siteTitle}` : siteTitle;
  const description = opts.description ?? `${opts.title} - ${siteTitle}`;
  const canonical = `${siteUrl}/posts/${opts.slug}`;

  const openGraph: Metadata['openGraph'] = {
    title: fullTitle,
    description,
    url: canonical,
    siteName: siteTitle,
    type: 'article',
    ...(opts.cover && {
      images: [
        {
          url: opts.cover,
          alt: opts.title,
        },
      ],
    }),
    ...(opts.date && {
      publishedTime: opts.date,
    }),
    ...(opts.author && {
      authors: [opts.author],
    }),
    ...(opts.tags && opts.tags.length > 0 && {
      tags: opts.tags,
    }),
  };

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph,
    twitter: {
      card: opts.cover ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description,
      ...(opts.cover && {
        images: [
          {
            url: opts.cover,
            alt: opts.title,
          },
        ],
      }),
    },
  };
}

/** 生成列表页面的 SEO Metadata */
export function buildListMetadata(opts: {
  title: string;
  description: string;
  path: string;
  siteTitle?: string;
  siteUrl?: string;
}): Metadata {
  const siteUrl = opts.siteUrl ?? getSiteUrl();
  const siteTitle = getSiteTitle(opts.siteTitle);
  const fullTitle = opts.title ? `${opts.title} - ${siteTitle}` : siteTitle;
  const canonical = `${siteUrl}${opts.path}`;

  return {
    title: fullTitle,
    description: opts.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url: canonical,
      siteName: siteTitle,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description: opts.description,
    },
  };
}
