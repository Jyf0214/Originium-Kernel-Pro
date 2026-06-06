'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import type { QuickAction } from '../_lib/types';

/** 仪表盘快捷操作区(写文章 / 文章管理 / 回收站) */
export function QuickActions({ actions, t }: { actions: QuickAction[]; t: (key: string) => string }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-zinc-900 mb-4">{t('dashboard.quickActions')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={index} href={action.href} className="group">
              <div className="bg-white rounded-2xl border border-zinc-100 p-5 hover:border-zinc-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-zinc-50 rounded-xl flex items-center justify-center group-hover:bg-zinc-900 transition-colors duration-300">
                      <Icon size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">{action.label}</div>
                      <div className="text-xs text-zinc-400">{action.desc}</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
