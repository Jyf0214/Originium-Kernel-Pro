import { Clock, FileText, Globe } from 'lucide-react';

import type { StatCardData, Stats } from './types';

/** 计算百分比,分母为 0 时返回 0 */
function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

/** 根据 stats + i18n 构造统计卡片数据(总文章 / 已发布 / 草稿) */
export function useStatCards(stats: Stats, t: (key: string) => string): StatCardData[] {
  const publishedRate = percent(stats.publishedArticles, stats.totalArticles);
  const draftRate = percent(stats.draftArticles, stats.totalArticles);
  const ofTotal = t('dashboard.ofTotal') ?? '占比';
  const hasArticles = stats.totalArticles > 0;

  return [
    {
      title: t('dashboard.allArticles'),
      value: stats.totalArticles,
      icon: FileText,
      color: 'bg-zinc-900',
      textColor: 'text-white',
    },
    {
      title: t('dashboard.published'),
      value: stats.publishedArticles,
      icon: Globe,
      color: 'bg-emerald-500',
      textColor: 'text-white',
      progress: { value: publishedRate, color: 'bg-emerald-400' },
      trend: hasArticles
        ? { rate: publishedRate, direction: publishedRate >= 50 ? 'up' : 'down', label: ofTotal }
        : undefined,
    },
    {
      title: t('dashboard.drafts'),
      value: stats.draftArticles,
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-white',
      progress: { value: draftRate, color: 'bg-amber-400' },
      trend: hasArticles
        ? { rate: draftRate, direction: draftRate <= 30 ? 'up' : 'down', label: ofTotal }
        : undefined,
    },
  ];
}
