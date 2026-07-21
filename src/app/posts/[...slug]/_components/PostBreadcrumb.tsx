import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

export type { Crumb };

export function PostBreadcrumb({ crumbs, t }: { slug: string; crumbs: Crumb[]; t: (key: string) => string }) {
  return (
    <nav aria-label="breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm mb-10 flex-wrap">
      <Link
        href="/posts"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-all font-medium"
      >
        {t('title')}
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
          {crumb.isLast ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold max-w-[200px] truncate shadow-sm text-xs">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-all font-medium text-xs"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
