'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import type { QuickAction } from '../_lib/types';
import type { TFunc } from '@/i18n/keys';

/** 仪表盘快捷操作区(写文章 / 文章管理 / 回收站) */
export function QuickActions({ actions, t }: { actions: QuickAction[]; t: TFunc }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('dashboard.quickActions')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={index} href={action.href} className="group">
              <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-5 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md dark:hover:shadow-zinc-900/40 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-zinc-50 dark:bg-zinc-700/60 rounded-xl flex items-center justify-center group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 transition-colors duration-200">
                      <Icon size={16} className="text-zinc-400 dark:text-zinc-500 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{action.label}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">{action.desc}</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
