import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getContentFile, getAllSlugs, getAdjacentPosts } from '@/lib/content';
import { buildWikiLinkMap, getBacklinks, getOutgoingReferences } from '@/lib/content-registry';
import { getSession } from '@/lib/auth';
import { loadConfig } from '@/lib/config';
import { getSiteUrl } from '@/const/url';

import { isPrivateSlug } from './_lib/post-utils';
import { getRelatedPosts } from './_lib/related-posts';
import { buildTocConfig, computeWordStats } from './_lib/post-page-config';
import { PostDetailBody } from './_components/PostDetailBody';
import { PostCoverSection } from './_components/PostCoverSection';
import { PostSidebar } from './_components/PostSidebar';
import { JsonLd } from '@/components/JsonLd';
import type { Crumb } from './_components/PostBreadcrumb';
import Footer from '@/components/Footer';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

// 私有文章需要运行时读取 session，必须动态渲染（不能 ISR 预渲染）
export const dynamic = 'force-dynamic';

// 公开文章使用 ISR（增量静态再生），每 600 秒（10 分钟）重新验证一次
// 私有文章由 dynamic = 'force-dynamic' 保证运行时渲染
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

  await enforceAccess(fullPath);

  const file = getContentFile('posts', fullPath);
  if (!file) notFound();

  const viewModel = buildViewModel(slug, fullPath, file.content, file.meta);

  return (
    <div className="min-h-screen flex flex-col">
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
      {/* 全屏宽封面 — 左右撑满视口，向上顶到导航栏下方 */}
      {file.meta.cover && (
        <PostCoverSection
          title={file.meta.title}
          author={file.meta.author}
          date={file.meta.date}
          type={file.meta.type}
          tags={file.meta.tags}
          cover={file.meta.cover}
        />
      )}
      <main className="flex-1 max-w-6xl 2xl:max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="lg:flex lg:gap-8 items-start">
          <div className="flex-1 min-w-0 bg-white dark:bg-zinc-800 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-zinc-100 dark:border-zinc-700 p-6 sm:p-8 md:p-10 lg:p-12">
            <PostDetailBody {...viewModel} omitHeader={!!file.meta.cover} />
          </div>
          <PostSidebar
            content={file.content}
            headingCount={viewModel.headingCount}
            tocConfig={viewModel.tocConfig}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

async function enforceAccess(fullPath: string): Promise<void> {
  if (!isPrivateSlug(fullPath)) return;
  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=/posts${fullPath}`);
  }
}

function buildViewModel(
  slug: string[],
  fullPath: string,
  content: string,
  meta: Record<string, unknown>,
) {
  const appConfig = loadConfig();
  const stats = computeWordStats(content);
  const tocConfig = buildTocConfig(appConfig);
  const wikiLinkMap = buildWikiLinkMap();
  const backlinks = getBacklinks('posts', fullPath);
  const outgoingRefs = getOutgoingReferences('posts', fullPath);

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
    // 多语言翻译映射（从 frontmatter translations 字段读取）
    translations: (meta.translations && typeof meta.translations === 'object')
      ? meta.translations as Record<string, string>
      : undefined,
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
