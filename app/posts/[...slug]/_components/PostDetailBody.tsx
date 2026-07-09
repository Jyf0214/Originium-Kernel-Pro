'use client';

import { useState } from 'react';
import { ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import { LazyMarkdownRenderer as MarkdownRenderer } from '@/components/MarkdownRenderer/dynamic';
import { ArticleEncryption } from '@/components/ArticleEncryption';
import { BacklinkPanel } from '@/components/BacklinkPanel';
import { Giscus } from '@/components/Comments/Giscus';
import { LazyLoad } from '@/components/ui/LazyLoad';
import { CopyrightNotice } from '@/components/ui/CopyrightNotice';
import ShareButtons from '@/components/ui/ShareButtons';
import QRCodeDialog from '@/components/ui/QRCodeDialog';
import { ReadingProgressBar } from '@/components/ui/ReadingProgressBar';
import { ContinueReadingPrompt } from '@/components/ui/ContinueReadingPrompt';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { Tag } from '@/components/ui/Tag';
import { PostLikeButton } from '@/components/PostLikeButton';
import { SeriesNavigation } from '@/components/SeriesNavigation';
import { PostBreadcrumb, type Crumb } from './PostBreadcrumb';
import { PostHeader } from './PostHeader';
import { PostRelated } from './PostRelated';
import { PostAdjacent } from './PostAdjacent';
import { PostNavigationShortcuts } from '@/components/PostNavigationShortcuts';
import { TranslationSwitcher } from '@/components/TranslationSwitcher';
import { PostSidebarCard } from '@/components/PostSidebarCard';
import { ArticleExpiredBanner } from '@/components/ArticleExpiredBanner';
import { Hitokoto } from '@/components/Hitokoto';
import type { RelatedPost } from '../_lib/related-posts';
import type { FrontendConfig } from '@/hooks/use-config';
import type { WikiLinkMap } from '@/components/MarkdownRenderer/types';
import type { BacklinkInfo, RegistryEntry } from '@/lib/content-registry';
import type { AuthorInfo } from '@/types/author';
import { buildCopyrightConfig, buildShareConfig } from '../_lib/post-page-config';
import { tPosts } from '../_lib/post-i18n';
import { useI18n } from '@/hooks/use-i18n';
import { useContinueReading } from '@/hooks/useContinueReading';
import { useSetPostTitle } from '@/contexts/PostPageContext';

// eslint-disable-next-line complexity
export function PostDetailBody({
  file,
  fullPath,
  fullUrl,
  relatedPosts,
  adjacentPosts,
  breadcrumbs,
  wordCount,
  readingTime,
  showWordCount,
  highlight,
  appConfig,
  wikiLinkMap,
  backlinks,
  outgoingRefs,
  translations,
  omitHeader,
  authorInfo,
  isEncrypted,
  isHidden,
  passwordHash,
  seriesInfo,
}: {
  file: { content: string; meta: Record<string, unknown> };
  fullPath: string;
  fullUrl: string;
  relatedPosts: RelatedPost[];
  adjacentPosts: { prev?: { slug: string; title: string } | null; next?: { slug: string; title: string } | null };
  breadcrumbs: Crumb[];
  wordCount: number;
  readingTime: number;
  showWordCount: boolean;
  highlight: FrontendConfig['highlight'];
  appConfig: FrontendConfig;
  wikiLinkMap?: WikiLinkMap;
  backlinks?: BacklinkInfo[];
  outgoingRefs?: RegistryEntry[];
  translations?: Record<string, string>;
  /** 有封面时跳过 PostHeader（封面已在卡片外单独渲染） */
  omitHeader?: boolean;
  authorInfo?: AuthorInfo | null;
  /** 文章是否加密（需要密码才能查看内容） */
  isEncrypted?: boolean;
  /** 文章是否隐藏（不在列表中显示，但可通过 URL 直接访问） */
  isHidden?: boolean;
  /** 密码哈希值（SHA-256） */
  passwordHash?: string;
  /** 系列文章导航信息 */
  seriesInfo?: { seriesName: string; articles: { slug: string; title: string; isCurrent: boolean }[] };
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const { t } = useI18n();
  const { savedData, setSavedData, handleRestore, handleDismiss } = useContinueReading();
  const titleStr = typeof file.meta.title === 'string' ? file.meta.title : '';
  useSetPostTitle(titleStr);

  return (
    <>
      <ReadingProgressBar pageKey={fullPath} onSavedPosition={setSavedData} />
      <ContinueReadingPrompt
        savedPosition={savedData?.position ?? null}
        onRestore={handleRestore}
        onDismiss={handleDismiss}
      />
      <ScrollToTop />
      <PostNavigationShortcuts
        prevSlug={adjacentPosts.prev?.slug ?? null}
        nextSlug={adjacentPosts.next?.slug ?? null}
      />
      <div className="flex-1 min-w-0 max-w-3xl">
      <PostBreadcrumb slug={fullPath} crumbs={breadcrumbs} t={tPosts} />

      {/* 文章内容容器 — 卡片样式 */}
      <div className="relative">
      <article className="bg-white dark:bg-zinc-800 rounded-3xl border border-zinc-100 dark:border-zinc-700 p-6 sm:p-8 md:p-10 lg:p-12 animate-card-slidein">
        {!omitHeader && (
          <PostHeader
            type={file.meta.type}
            tags={file.meta.tags}
            title={file.meta.title}
            author={file.meta.author}
            date={file.meta.date}
            cover={file.meta.cover}
            authorInfo={authorInfo}
          />
        )}

        {/* 隐藏文章标识 — 仅展示标签 */}
        {isHidden && (
          <div className="mb-6">
            <Tag variant="amber" size="sm">
              仅展示
            </Tag>
          </div>
        )}

        {/* 多语言版本切换 */}
        {translations && Object.keys(translations).length > 0 && (
          <TranslationSwitcher
            slug={fullPath}
            initialTranslations={translations}
            className="mb-6"
          />
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent mb-12" />

        {/* 系列文章导航 — 在文章正文前显示 */}
        {seriesInfo && seriesInfo.articles.length > 1 && (
          <SeriesNavigation
            seriesName={seriesInfo.seriesName}
            articles={seriesInfo.articles}
          />
        )}

        {/* 文章过期提示 — 超过180天的文章显示提示横幅 */}
        {typeof file.meta.date === 'string' && (
          <ArticleExpiredBanner date={file.meta.date} slug={fullPath} />
        )}

        <div>
          {/* 加密文章：显示密码验证界面；验证成功后显示内容 */}
          {isEncrypted && decrypted === null ? (
            <ArticleEncryption
              passwordHash={passwordHash ?? ''}
              encryptedContent={file.content}
              onDecrypted={setDecrypted}
            />
          ) : (
            <MarkdownRenderer
              content={isEncrypted ? (decrypted ?? '') : file.content}
              highlight={highlight}
              wikiLinkMap={wikiLinkMap}
            />
          )}
        </div>

        {/* 关联引用面板 */}
        <BacklinkPanel
          section="posts"
          slug={fullPath}
          initialBacklinks={backlinks}
          initialOutgoing={outgoingRefs}
        />
      </article>

      {/* 浮动信息卡片 — 桌面端右侧 */}
      <div className="hidden 2xl:block absolute top-0 w-52" style={{ left: 'calc(100% + 1.5rem)' }}>
        <div className="sticky top-24">
          <PostSidebarCard
            authorInfo={authorInfo}
            wordCount={wordCount}
            readingTime={readingTime}
            date={typeof file.meta.date === 'string' ? file.meta.date : undefined}
            tags={Array.isArray(file.meta.tags) ? file.meta.tags : undefined}
            onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        </div>
      </div>
      </div>

      {/* 作者信息 — 单独容器 */}
      <div className="mt-12">
        <CopyrightNotice
          author={(file.meta.author as string | undefined) ?? (appConfig.footer?.owner as { author?: string } | undefined)?.author ?? ''}
          title={file.meta.title as string}
          slug={fullPath}
          type={file.meta.type as 'original' | 'reprint' | undefined}
          config={buildCopyrightConfig(appConfig)}
          authorInfo={authorInfo}
        />
      </div>

      {/* 分享按钮 + 点赞 — 紧跟作者 */}
      <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
        <ShareButtons
          title={file.meta.title as string}
          url={fullUrl}
          config={buildShareConfig(appConfig)}
        />
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors text-sm text-zinc-600 dark:text-zinc-300"
          title="分享二维码"
        >
          <QrCode size={16} />
          二维码
        </button>
        <PostLikeButton slug={fullPath} />
      </div>

      {/* 一言 — 文章底部 */}
      <div className="mt-10">
        <Hitokoto />
      </div>

      <QRCodeDialog
        open={qrOpen}
        url={fullUrl}
        title={file.meta.title as string}
        onClose={() => setQrOpen(false)}
      />

      {/* 评论区 — 最下面 */}
      <div className="mt-12 max-w-3xl">
        <LazyLoad rootMargin="300px">
          <Giscus slug={fullPath} />
        </LazyLoad>
      </div>

      {showWordCount && (
        <div className="mt-12 px-6 py-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            <span>{t('posts.wordCountLabel', { count: wordCount.toLocaleString() })}</span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>
            <span>{t('posts.readingTimeLabel', { minutes: readingTime })}</span>
          </div>
        </div>
      )}

      <PostRelated posts={relatedPosts} />

      <div className="mt-20 pt-8 border-t border-zinc-100 dark:border-zinc-700">
        <PostAdjacent prev={adjacentPosts.prev ?? null} next={adjacentPosts.next ?? null} />

        <Link
          href="/posts"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {tPosts('backToPosts')}
        </Link>
      </div>
    </div>
    </>
  );
}
