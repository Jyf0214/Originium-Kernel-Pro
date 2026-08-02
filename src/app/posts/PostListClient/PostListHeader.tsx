'use client';

import { Search, BookOpen, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export function PostListHeader({
  searchTerm,
  onSearchChange,
  postCount,
  t,
  locale,
  rightExtra,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  postCount: number;
  t: (key: string) => string;
  locale: 'zh-CN' | 'en';
  rightExtra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-10">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
        <Input
          placeholder={t('home.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 pr-10 text-base"
          size="xl"
          rounded="lg"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label={t('home.clearSearch')}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {rightExtra}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-zinc-200">
          <BookOpen size={16} className="text-zinc-400" />
          <span className="text-sm font-bold text-zinc-900">{postCount}</span>
          <span className="text-xs text-zinc-400">{locale === 'zh-CN' ? t('posts.unit') : 'posts'}</span>
        </div>
      </div>
    </div>
  );
}
