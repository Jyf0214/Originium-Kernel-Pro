import React from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { HeroBanner } from '@/components/ui/HeroBanner';
import { BookOpen, Github, Shield, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FeedbackForm } from '@/components/FeedbackForm';
import { VERSION } from '@/data/version';
import { getTranslate } from '@/i18n/translate';
import type { I18nKey } from '@/i18n/keys';

const featureKeys = [
  { icon: BookOpen, titleKey: 'about.contentMgmt', descKey: 'about.contentMgmtDesc' },
  { icon: Shield, titleKey: 'about.securityFirst', descKey: 'about.securityFirstDesc' },
  { icon: Globe, titleKey: 'about.international', descKey: 'about.internationalDesc' },
  { icon: Github, titleKey: 'about.gitDriven', descKey: 'about.gitDrivenDesc' },
] satisfies { icon: typeof BookOpen; titleKey: I18nKey; descKey: I18nKey }[];

export default function AboutPage() {
  const features = featureKeys.map((f) => ({
    icon: f.icon,
    title: getTranslate(f.titleKey),
    description: getTranslate(f.descKey),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <PageContainer maxWidth="5xl" padding="compact">
        <HeroBanner
          title={getTranslate('about.title')}
          description={getTranslate('about.desc')}
          align="center"
          size="default"
          buttons={[
            {
              label: getTranslate('about.browseArticles'),
              variant: 'primary',
              icon: <BookOpen size={16} />,
              href: '/posts',
            },
          ]}
          className="mb-10 sm:mb-12"
        />

        {/* 项目简介 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">{getTranslate('about.intro')}</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {getTranslate('about.introDesc')}
          </p>
        </section>

        {/* 功能特点 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">{getTranslate('about.features')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-5 sm:p-6 hover:border-zinc-200 dark:hover:border-zinc-500 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-3">
                    <Icon size={20} className="text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 技术栈 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">{getTranslate('about.techStack')}</h2>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-5 sm:p-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Next.js 16 (App Router)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Tailwind CSS v4
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Prisma + SQLite
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                Markdown / gray-matter
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                {getTranslate('about.motionLib')}
              </li>
            </ul>
          </div>
        </section>

        {/* 版本信息 */}
        {VERSION && (
          <section className="mb-10 sm:mb-12">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-5 sm:p-6 text-center">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">{getTranslate('about.currentVersion')}</p>
              <p className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">{VERSION}</p>
            </div>
          </section>
        )}

        {/* 反馈 */}
        <section className="mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">{getTranslate('about.feedback')}</h2>
          <FeedbackForm />
        </section>

        {/* 链接 */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/posts"
            >
              <Button variant="primary" size="lg" autoLoading={false}>
                <BookOpen size={16} />
                {getTranslate('about.browseArticles')}
              </Button>
            </Link>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
