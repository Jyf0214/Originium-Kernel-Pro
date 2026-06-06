'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Tag } from '@/components/ui/Tag';

import type { RecentArticle } from '../_lib/types';

/** 状态对应 Tag 变体 */
function statusVariant(status: RecentArticle['status']): 'emerald' | 'amber' | 'warning' {
  if (status === 'published') return 'emerald';
  if (status === 'pending_deletion') return 'amber';
  return 'warning';
}

/** 状态对应本地化文案 */
function statusLabel(status: RecentArticle['status'], t: (key: string) => string): string {
  if (status === 'published') return t('article.published');
  if (status === 'pending_deletion') return t('article.pendingDeletion');
  return t('article.draft');
}

/** 格式化日期,空值返回占位 */
function formatDate(updatedAt: string, locale: string): string {
  if (!updatedAt) return '—';
  return new Date(updatedAt).toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US');
}

/** 点击文章:已发布跳详情,其他跳编辑 */
function navigateToArticle(article: RecentArticle, router: ReturnType<typeof useRouter>): void {
  if (article.status === 'published' && article.slug) {
    router.push(`/posts${article.slug}`);
  } else {
    router.push(`/editor?id=${article.id}`);
  }
}

/** 最近文章列表(不含卡片外壳) */
export function RecentArticlesList({
  articles,
  t,
  locale,
}: {
  articles: RecentArticle[];
  t: (key: string) => string;
  locale: string;
}) {
  const router = useRouter();

  return (
    <div className="divide-y divide-zinc-50">
      {articles.map((article) => (
        <div
          key={article.id}
          className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors cursor-pointer group"
          onClick={() => navigateToArticle(article, router)}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-900 truncate group-hover:text-zinc-600 transition-colors">
              {article.title}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {formatDate(article.updatedAt, locale)}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Tag variant={statusVariant(article.status)} size="sm">
              {statusLabel(article.status, t)}
            </Tag>
            <ArrowRight size={14} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}
