import { getSiteUrl } from '@/const/url';

interface BreadcrumbJsonLdProps {
  /** 面包屑层级列表，从首页到当前页 */
  items: { name: string; url: string }[];
}

/**
 * 面包屑 JSON-LD 结构化数据
 *
 * 帮助搜索引擎理解网站层级结构，
 * 可在搜索结果中展示面包屑导航路径。
 * 参考：https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const siteUrl = getSiteUrl();

  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
