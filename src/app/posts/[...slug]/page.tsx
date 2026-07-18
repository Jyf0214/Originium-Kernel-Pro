import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { getContentFile, getContentFiles, getContentIndexes, filterPublicFiles, getAllSlugs, getAdjacentPosts } from '@/lib/content';
import { buildWikiLinkMap, getBacklinks, getOutgoingReferences } from '@/lib/content-registry';
import { loadConfig } from '@/lib/config';
import { getAuthorByName } from '@/lib/authors';
import { getSiteUrl } from '@/const/url';

import { isPrivateSlug } from './_lib/post-utils';
import { getRelatedPosts } from './_lib/related-posts';
import { buildTocConfig, computeWordStats } from './_lib/post-page-config';
import { PostDetailBody } from './_components/PostDetailBody';
import { PostCoverSection } from './_components/PostCoverSection';
import { PostSidebarTrigger, PostSidebarDesktop } from './_components/PostSidebar';
import { JsonLd } from '@/components/JsonLd';
import { PostPageProvider } from '@/contexts/PostPageContext';
import type { Crumb } from './_components/PostBreadcrumb';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// 静态导出模式：所有公开文章预渲染为静态 HTML
// 私有文章在构建时也会被预渲染，但不包含实际内容
export const revalidate = 600;

export function generateStaticParams() {
  const slugs = getAllSlugs('posts');
  return slugs
    .filter((slug) => !isPrivateSlug(slug))
    .map((slug) => ({ slug: slug.slice(1).split('/') }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');
  const file = getContentFile('posts', fullPath);
  if (!file) return { title: '未找到' };
  return {
    title: `${file.meta.title} - Originium Kernel`,
    description: file.meta.description ?? file.content.slice(0, 160),
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const fullPath = '/' + slug.join('/');

  const file = getContentFile('posts', fullPath);
  if (!file) notFound();

  const viewModel = await buildViewModel(slug, fullPath, file.content, file.meta);

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* 固定背景画布层 — 滚动时背景不动，营造"锚定感" */}
      <div className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-900" aria-hidden="true" />
      <JsonLd
        title={file.meta.title}
        description={file.meta.description}
        datePublished={file.meta.date}
        author={file.meta.author}
        tags={file.meta.tags}
        slug={fullPath}
        wordCount={viewModel.wordCount}
      />
      {/* 全屏宽封面 — 正常文档流，导航栏绝对定位叠加在上方 */}
      {file.meta.cover && (
        <PostCoverSection
          title={file.meta.title}
          author={file.meta.author}
          date={file.meta.date}
          type={file.meta.type}
          tags={file.meta.tags}
          cover={file.meta.cover}
          authorInfo={viewModel.authorInfo}
        />
      )}
      <main className={`flex-1 max-w-6xl 2xl:max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 ${file.meta.cover ? '' : 'pt-8'}`}>
        <div className="lg:flex lg:gap-8 items-start">
          <div className="flex-1 min-w-0">
            {/* 移动端目录按钮 — 在文章内容之前 */}
            <PostSidebarTrigger
              content={file.content}
              headingCount={viewModel.headingCount}
              tocConfig={viewModel.tocConfig}
            />
            <PostPageProvider>
              <PostDetailBody {...viewModel} />
            </PostPageProvider>
          </div>
          <div className="animate-sidebar-slidein">
            <PostSidebarDesktop
              content={file.content}
              headingCount={viewModel.headingCount}
              tocConfig={viewModel.tocConfig}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

async function buildViewModel(
  slug: string[],
  fullPath: string,
  content: string,
  meta: Record<string, unknown>,
) {
  const appConfig = await loadConfig();
  const stats = computeWordStats(content);
  const tocConfig = buildTocConfig(appConfig);
  const wikiLinkMap = buildWikiLinkMap();
  const backlinks = getBacklinks('posts', fullPath);
  const outgoingRefs = getOutgoingReferences('posts', fullPath);
  const authorName = typeof meta.author === 'string' ? meta.author : '';
  const authorInfo = getAuthorByName(authorName);

  // 文章加密：读取 frontmatter 中的 password 字段（SHA-256 哈希值）
  const passwordHash = typeof meta.password === 'string' ? meta.password : '';
  const isEncrypted = !!passwordHash;
  // 文章隐藏：读取 frontmatter 中的 hidden 字段
  const isHidden = meta.hidden === true;

  // 系列文章导航：读取 frontmatter 中的 series 字段
  const seriesName = typeof meta.series === 'string' ? meta.series : '';
  let seriesInfo: { seriesName: string; articles: { slug: string; title: string; isCurrent: boolean }[] } | undefined;
  if (seriesName) {
    const indexes = getContentIndexes('posts');
    const allFiles = filterPublicFiles(getContentFiles('posts'), indexes);
    const seriesArticles = allFiles
      .filter((f) => typeof f.meta.series === 'string' && f.meta.series === seriesName)
      .sort((a, b) => {
        // 按日期升序排列（系列内从旧到新）
        const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
        const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
        return dateA - dateB;
      })
      .map((f) => ({
        slug: f.slug,
        title: f.meta.title,
        isCurrent: f.slug === fullPath,
      }));
    seriesInfo = { seriesName, articles: seriesArticles };
  }

  return {
    file: { content, meta },
    fullPath,
    fullUrl: `${getSiteUrl()}/posts${fullPath}`,
    relatedPosts: getRelatedPosts(fullPath, (meta.tags as string[] | undefined) ?? []),
    adjacentPosts: getAdjacentPosts(fullPath),
    breadcrumbs: buildBreadcrumbs(slug),
    wordCount: stats.wordCount,
    readingTime: stats.readingTime,
    headingCount: stats.headingCount,
    showWordCount: appConfig.wordcount?.enable ?? false,
    highlight: appConfig.highlight,
    tocConfig,
    appConfig,
    wikiLinkMap,
    backlinks,
    outgoingRefs,
    authorInfo,
    isEncrypted,
    isHidden,
    passwordHash,
    // 多语言翻译映射（从 frontmatter translations 字段读取）
    translations: (meta.translations && typeof meta.translations === 'object')
      ? meta.translations as Record<string, string>
      : undefined,
    // 系列文章导航信息
    seriesInfo,
  };
}

function buildBreadcrumbs(slug: string[]): Crumb[] {
  return slug.map((segment, index) => {
    const fullPath = '/posts/' + slug.slice(0, index + 1).join('/');
    const file = getContentFile('posts', '/' + slug.slice(0, index + 1).join('/'));
    return {
      label: file?.meta.title ?? segment,
      href: fullPath,
      isLast: index === slug.length - 1,
    };
  });
}
