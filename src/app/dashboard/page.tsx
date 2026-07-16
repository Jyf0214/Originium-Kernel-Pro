'use client';

import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';

import { DashboardHeader } from './_components/DashboardHeader';
import { QuickActions } from './_components/QuickActions';
import { RecentArticlesCard } from './_components/RecentArticlesCard';
import { StatCard } from './_components/StatCard';
import { useDashboardData } from './_lib/use-dashboard-data';
import { useQuickActions } from './_lib/use-quick-actions';
import { useStatCards } from './_lib/use-stat-cards';

/** 仪表盘入口:数据 + 视图模型 + 渲染 */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const { stats, recentArticles, loading } = useDashboardData();
  const statCards = useStatCards(stats, t);
  const quickActions = useQuickActions(t);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <GlobalLoading size="large" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="6xl">
      <DashboardHeader user={user} t={t} />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {statCards.map((card, index) => (
          <StatCard key={index} card={card} />
        ))}
      </div>
      <QuickActions actions={quickActions} t={t} />
      <RecentArticlesCard articles={recentArticles} t={t} locale={locale} />
    </PageContainer>
  );
}
