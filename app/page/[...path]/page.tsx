import { PAGES_PREFIX } from '@/lib/page-source/shared';
import { fetchPageHtml, fetchPageMeta } from '@/lib/page-source/fs';
import CustomPageView from './CustomPageView';

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export const dynamic = 'force-dynamic';

export default async function CustomPage({ params }: PageProps) {
  const { path: pathSegments } = await params;

  // 构建相对路径
  const relativePath = pathSegments.length > 0
    ? `${PAGES_PREFIX}/${pathSegments.join('/')}`
    : PAGES_PREFIX;

  // 尝试获取页面内容
  const html = await fetchPageHtml(relativePath);

  if (!html) {
    // 页面不存在，返回 404 或重定向到索引页
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>页面不存在</h1>
        <p>找不到请求的页面: /page/{pathSegments.join('/')}</p>
        <a href="/page">返回页面列表</a>
      </div>
    );
  }

  // 获取页面元数据
  const meta = await fetchPageMeta(relativePath);

  return <CustomPageView html={html} title={meta?.title} />;
}
