import { getSiteUrl } from '@/const/url';

interface JsonLdProps {
  title: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  tags?: string[];
  slug: string;
  wordCount?: number;
}

/**
 * 文章页 JSON-LD 结构化数据
 *
 * 帮助搜索引擎理解文章内容，提升搜索结果展示（富摘要）
 * 参考：https://developers.google.com/search/docs/appearance/structured-data/article
 */
export function JsonLd({
  title,
  description,
  datePublished,
  dateModified,
  author,
  tags,
  slug,
  wordCount,
}: JsonLdProps) {
  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/posts${slug}`;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description ?? '',
    url: articleUrl,
    author: {
      '@type': 'Person',
      name: author ?? 'Anonymous',
    },
    datePublished: datePublished ?? new Date().toISOString(),
    dateModified: dateModified ?? datePublished ?? new Date().toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Originium Kernel',
      url: siteUrl,
    },
    ...(tags && tags.length > 0 ? { keywords: tags.join(', ') } : {}),
    ...(wordCount ? { wordCount } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
