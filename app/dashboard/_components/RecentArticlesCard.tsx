'use client';

import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import ProCard from '@/components/ui/ProCard';

import type { RecentArticle } from '../_lib/types';
import { RecentArticlesList } from './RecentArticlesList';

/** 最近文章卡片(ProCard 包装列表或空状态) */
export function RecentArticlesCard({
  articles,
  t,
  locale,
}: {
  articles: RecentArticle[];
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <ProCard
      title={t('dashboard.recentArticles')}
      extra={
        <Link href="/dashboard/articles">
          <Button size="sm" icon={<ArrowRight size={14} />} rounded="md">
            {t('dashboard.viewAll')}
          </Button>
        </Link>
      }
      padding="p-0"
    >
      {articles.length > 0 ? (
        <RecentArticlesList articles={articles} t={t} locale={locale} />
      ) : (
        <EmptyState
          variant="minimal"
          icon={
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300">
              <Sparkles size={28} />
            </div>
          }
          description={t('dashboard.noArticles')}
          action={
            <Link href="/editor">
              <Button variant="primary" icon={<Plus size={14} />} rounded="md">
                {t('dashboard.writeFirstArticle')}
              </Button>
            </Link>
          }
        />
      )}
    </ProCard>
  );
}
