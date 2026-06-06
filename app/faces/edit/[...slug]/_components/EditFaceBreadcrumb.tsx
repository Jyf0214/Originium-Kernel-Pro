'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** 编辑页面包屑导航 */
export function EditFaceBreadcrumb({
  fullPath,
  title,
  t,
}: {
  fullPath: string;
  title: string;
  t: (key: string) => string;
}) {
  return (
    <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8 flex-wrap">
      <Link
        href="/faces"
        className="hover:text-zinc-900 transition-colors flex items-center gap-1"
      >
        <ArrowLeft size={14} />
        {t('nav.faces')}
      </Link>
      <span>/</span>
      <Link
        href={`/faces${fullPath}`}
        className="hover:text-zinc-900 transition-colors"
      >
        {title}
      </Link>
      <span>/</span>
      <span className="text-zinc-900 font-medium">编辑</span>
    </nav>
  );
}
