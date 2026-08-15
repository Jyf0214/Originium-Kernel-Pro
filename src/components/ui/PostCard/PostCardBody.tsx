import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pin, Calendar, Clock } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import { Avatar } from '@/components/Avatar';
import { formatPostDate, resolveDisplayDate } from '@/lib/format-date';
import { useConfig } from '@/hooks/use-config';
import { useVisitedPosts } from '@/hooks/use-visited-posts';
import type { TFunc } from '@/i18n/keys';
import type { PostItem } from './types';
import type { PostMetaDisplayConfig } from '@/lib/config-types';

/** 从 slug 提取分类（第一级目录名），根路径无分类 */
function extractCategory(slug: string): string | undefined {
  const parts = slug.split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : undefined;
}

/** 卡片主体圆角类名（按 position 区分） */
function getBodyRoundClass(position?: string): string {
  if (position === 'right') return 'rounded-l-2xl sm:rounded-l-[2rem]';
  if (position === 'left') return 'rounded-r-2xl sm:rounded-r-[2rem]';
  return 'rounded-b-2xl sm:rounded-b-[2rem]';
}

/** 有封面且非左右布局时的玻璃效果类 */
function getGlassClass(hasCover: boolean, isRowLayout: boolean): string {
  return hasCover && !isRowLayout
    ? 'bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md border-t border-white/20 dark:border-white/10'
    : '';
}

/** 无封面或左右布局时的边框类 */
function getBorderClass(hasCover: boolean, isRowLayout: boolean): string {
  return hasCover && isRowLayout ? '' : 'border border-zinc-100 dark:border-zinc-700';
}

/** 解析 postMeta 元信息显示开关（tags/categories/label）与分类 */
function resolveMetaFlags(postMeta: PostMetaDisplayConfig | undefined, slug: string) {
  const showTags = postMeta?.tags ?? true;
  const showCategories = postMeta?.categories ?? true;
  const showLabel = postMeta?.label ?? false;
  const category = showCategories ? extractCategory(slug) : undefined;
  return { showTags, showCategories, showLabel, category };
}

/** 分类/标签元信息行（受 postMeta.tags/categories/label 配置控制） */
function MetaRow({
  showCategories,
  showTags,
  showLabel,
  category,
  tags,
  t,
}: {
  showCategories: boolean;
  showTags: boolean;
  showLabel: boolean;
  category?: string;
  tags: string[];
  t: TFunc;
}) {
  const hasContent = (showCategories && category) || (showTags && tags.length > 0);
  if (!hasContent) return null;
  return (
    <div className="flex flex-wrap gap-1 mb-2 overflow-hidden">
      {showCategories && category && (
        <Tag variant="light" size="xs" className="truncate max-w-[120px]">
          {showLabel && <span className="opacity-70 mr-0.5">{t('home.categories')}:</span>}
          {category}
        </Tag>
      )}
      {showTags && tags.slice(0, 2).map((tag) => (
        <Tag key={tag} variant="light" size="xs" className="truncate max-w-[120px]">
          {showLabel && <span className="opacity-70 mr-0.5">{t('home.tags')}:</span>}
          {tag}
        </Tag>
      ))}
    </div>
  );
}

function PostCardBodyFooter({
  post,
  locale,
  t,
  dateFormat,
  dateType,
}: {
  post: PostItem;
  locale: string;
  t: TFunc;
  dateFormat: PostMetaDisplayConfig['dateFormat'];
  dateType?: PostMetaDisplayConfig['dateType'];
}) {
  const shownDate = resolveDisplayDate(post.date, post.updated, dateType);
  return (
    <div className="mt-auto pt-3 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 min-w-0">
      {/* 作者区：占满剩余空间，超长作者名截断（flex-1 + min-w-0 使 truncate 生效） */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Avatar
          name={post.authorNickname ?? post.author ?? ''}
          avatarUrl={post.authorAvatar}
          size={20}
        />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate">
          {post.authorNickname ?? post.author ?? t('home.anonymous')}
        </span>
      </div>
      {/* 阅读时间/日期区：允许收缩，空间不足时逐项截断而非挤出屏幕 */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 min-w-0">
        {post.readingTime && post.readingTime > 0 && (
          <span className="flex items-center gap-0.5 min-w-0">
            <Clock size={10} className="shrink-0" />
            <span className="truncate">{t('posts.readingTimeLabel', { minutes: post.readingTime })}</span>
          </span>
        )}
        {shownDate && (
          <span className="flex items-center gap-0.5 min-w-0">
            <Calendar size={10} className="shrink-0" />
            <span className="truncate">{formatPostDate(shownDate, locale, dateFormat)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export const PostCardBody = React.memo(function PostCardBody({
  post,
  locale,
  t,
  position,
  hasCover,
  postMeta,
}: {
  post: PostItem;
  locale: string;
  t: TFunc;
  position?: string;
  hasCover?: boolean;
  /** 列表页文章元信息显示配置（postMeta.page） */
  postMeta?: PostMetaDisplayConfig;
}) {
  const isRowLayout = position === 'left' || position === 'right';

  const glassClass = getGlassClass(!!hasCover, isRowLayout);
  const borderClass = getBorderClass(!!hasCover, isRowLayout);

  // postMeta 开关：tags/categories/label 控制元信息展示
  const { showTags, showCategories, showLabel, category } = resolveMetaFlags(postMeta, post.slug);

  // 未读标记（postMeta.post.unread）：已访问过的文章不再显示圆点
  const { config } = useConfig();
  const { visited } = useVisitedPosts();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const showUnread = mounted && config?.postMeta?.post?.unread === true && !visited.has(post.slug);

  return (
    <div className={`px-4 sm:px-5 py-3 sm:py-4 flex-1 flex flex-col overflow-hidden min-h-[180px] z-10 ${getBodyRoundClass(position)} ${glassClass} ${borderClass}`}>
      {post.pinned && (
        <div className="inline-flex items-center gap-1.5 mb-2 self-start bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 px-2 py-0.5 rounded-md">
          <Pin size={8} className="text-amber-400/80" />
          <Tag size="xs" variant="dark">
            {t('home.pinned')}
          </Tag>
        </div>
      )}
      <MetaRow
        showCategories={showCategories}
        showTags={showTags}
        showLabel={showLabel}
        category={category}
        tags={post.tags}
        t={t}
      />
      <Link href={`/posts${post.slug}`} className="block group/title">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 leading-snug group-hover/title:text-zinc-600 dark:group-hover/title:text-zinc-300 transition-colors duration-200">
          <span className="flex items-start gap-1.5">
            {showUnread && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-2"
                aria-label={t('components.PostMetaConfig.unreadMarker')}
              />
            )}
            <span className="line-clamp-2">{post.title}</span>
          </span>
        </h2>
      </Link>
      {post.description && (
        <p className="text-zinc-400 text-xs line-clamp-2 mb-2 leading-relaxed">
          {post.description}
        </p>
      )}
      <PostCardBodyFooter post={post} locale={locale} t={t} dateFormat={postMeta?.dateFormat ?? 'simple'} dateType={postMeta?.dateType} />
    </div>
  );
});