'use client';

import { AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/hooks/use-i18n';
import { CategoryBar } from '@/components/CategoryBar';
import { HeroSection } from './HeroSection';
import { PostCard } from '@/components/ui/PostCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from './Pagination';
import { useHomeFilter } from './use-home-filter';
import type { HomePostGridProps } from './types';

export type { HomePostGridProps } from './types';
export type { PostItem, CoverConfig } from '@/components/ui/PostCard';

export function HomePostGrid({
  posts,
  heroTitleLine1,
  heroTitleLine2,
  defaultCover,
  coverConfig,
}: HomePostGridProps) {
  const { t, locale } = useI18n();
  const {
    selectedTag,
    setSelectedTag,
    currentPage,
    setCurrentPage,
    filteredPosts,
    totalPages,
    paginatedPosts,
    allTags,
  } = useHomeFilter(posts);

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
      <HeroSection
        heroTitleLine1={heroTitleLine1}
        heroTitleLine2={heroTitleLine2}
        t={t}
      />

      <div className="mb-10 sticky top-[72px] z-30 md:relative md:top-0">
        <CategoryBar
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t('home.latestPosts')}</h2>
          {posts.length > 0 && (
            <Link href="/posts" className="text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors">
              {t('home.viewAll')} <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPosts.length > 0
              ? paginatedPosts.map((post, idx) => (
                  <PostCard
                    key={post.slug}
                    post={post}
                    index={idx}
                    coverConfig={coverConfig}
                    defaultCover={defaultCover}
                    t={t}
                    locale={locale}
                  />
                ))
              : (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<Sparkles size={40} />}
                      title={t('home.emptyTitle')}
                      description={t('home.noPosts')}
                      variant="card"
                    />
                  </div>
                )}
          </AnimatePresence>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} t={t} />
      </section>
    </main>
  );
}

export default HomePostGrid;
