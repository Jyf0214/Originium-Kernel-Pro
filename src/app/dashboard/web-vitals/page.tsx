'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { getTranslate } from '@/i18n/translate';
import { GlobalLoading } from '@/components/Loading';
import { PageContainer } from '@/components/ui/PageContainer';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Gauge, BarChart3, Zap, Shield } from 'lucide-react';

/** 指标说明卡片 */
const features = [
  {
    icon: Gauge,
    title: 'Core Web Vitals',
    desc: getTranslate('webVitals.featureCwvDesc'),
  },
  {
    icon: BarChart3,
    title: getTranslate('webVitals.featurePercentileTitle'),
    desc: getTranslate('webVitals.featurePercentileDesc'),
  },
  {
    icon: Zap,
    title: getTranslate('webVitals.featureRealtimeTitle'),
    desc: getTranslate('webVitals.featureRealtimeDesc'),
  },
  {
    icon: Shield,
    title: getTranslate('webVitals.featureReliabilityTitle'),
    desc: getTranslate('webVitals.featureReliabilityDesc'),
  },
];

export default function WebVitalsPage() {
  const { user, isSudo, loading: authLoading } = useAuth();
  const { t } = useI18n();

  if (authLoading) return <GlobalLoading />;
  if (!user || !isSudo) return null;

  const vercelAnalyticsUrl = 'https://vercel.com/.analytics';

  return (
    <PageContainer maxWidth="4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Web Vitals</h1>
        <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">{t('webVitals.subtitle')}</p>
      </div>

      {/* 迁移提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <ExternalLink size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              {t('webVitals.migratedTitle')}
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              {t('webVitals.migratedDesc')}
            </p>
            <Button
              variant="primary"
              size="md"
              icon={<ExternalLink size={16} />}
              onClick={() => window.open(vercelAnalyticsUrl, '_blank')}
              autoLoading={false}
            >
              {t('webVitals.openAnalytics')}
            </Button>
          </div>
        </div>
      </div>

      {/* 功能说明 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{f.title}</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
