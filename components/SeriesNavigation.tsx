'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/ui';

interface SeriesArticle {
  slug: string;
  title: string;
  isCurrent: boolean;
}

interface SeriesNavigationProps {
  seriesName: string;
  articles: SeriesArticle[];
}

/**
 * 系列文章导航组件
 *
 * 显示当前系列的所有文章列表，当前文章高亮，
 * 支持上一篇/下一篇快速导航，列表项交错进场动画。
 */
export const SeriesNavigation = React.memo(function SeriesNavigation({ seriesName, articles }: SeriesNavigationProps) {
  const currentIndex = articles.findIndex((a) => a.isCurrent);
  const prevArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const nextArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  return (
    <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-850 rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-700/50 mb-8">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={18} className="text-zinc-500 dark:text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          系列文章 - {seriesName}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">
          {currentIndex + 1} / {articles.length}
        </span>
      </div>

      {/* 文章列表 */}
      <ul className="space-y-1 mb-4">
        {articles.map((article, index) => (
          <motion.li
            key={article.slug}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link
              href={`/posts${article.slug}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                article.isCurrent
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium shadow-sm border border-zinc-200/50 dark:border-zinc-600/50'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50',
              )}
            >
              <span
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                  article.isCurrent
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400',
                )}
              >
                {index + 1}
              </span>
              <span className="truncate">{article.title}</span>
            </Link>
          </motion.li>
        ))}
      </ul>

      {/* 上一篇/下一篇导航 */}
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
        {prevArticle ? (
          <Link
            href={`/posts${prevArticle.slug}`}
            className="flex-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
          >
            <ChevronUp size={14} />
            上一篇
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {nextArticle ? (
          <Link
            href={`/posts${nextArticle.slug}`}
            className="flex-1 inline-flex items-center justify-end gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
          >
            下一篇
            <ChevronDown size={14} />
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </div>
    </div>
  );
});
