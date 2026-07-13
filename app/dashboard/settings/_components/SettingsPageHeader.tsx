'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * 设置页顶部导航：返回按钮 + 标题 + 副标题。
 */
export function SettingsPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      <Link
        href="/dashboard"
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all shrink-0"
      >
        <ArrowLeft size={16} />
      </Link>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-zinc-900 truncate">{title}</h1>
        <p className="text-zinc-400 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
