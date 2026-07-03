'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { LayoutGrid, List, AlignJustify } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { PostListHeader } from './PostListHeader';
import { GroupTabs } from './GroupTabs';
import { PostListItem } from './PostListItem';
import { PostListEmptyState } from './PostListEmptyState';
import { usePostFilter } from './use-post-filter';
import type { PostListClientProps } from './types';

export type { PostItem, GroupItem, CoverConfig, PostListClientProps } from './types';

type LayoutMode = 'grid' | 'list' | 'compact';

const LAYOUT_OPTIONS: { key: LayoutMode; icon: typeof LayoutGrid; label: string }[] = [
  { key: 'grid', icon: LayoutGrid, label: '网格视图' },
  { key: 'list', icon: List, label: '列表视图' },
  { key: 'compact', icon: AlignJustify, label: '紧凑视图' },
];

const LAYOUT_STORAGE_KEY = 'post-list-layout';

/** 从 localStorage 读取已保存的布局偏好 */
function getSavedLayout(): LayoutMode {
  if (typeof window === 'undefined') return 'grid';
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'grid' || saved === 'list' || saved === 'compact') return saved;
  } catch {
    // localStorage 不可用时使用默认值
  }
  return 'grid';
}

export function PostListClient({ posts, groups, coverConfig }: PostListClientProps) {
  const { t, locale } = useI18n();
  const [layout, setLayout] = useState<LayoutMode>('grid');

  // 挂载时从 localStorage 恢复布局偏好
  useEffect(() => {
    setLayout(getSavedLayout());
  }, []);

  const handleLayoutChange = useCallback((mode: LayoutMode) => {
    setLayout(mode);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
    } catch {
      // 忽略写入失败
    }
  }, []);

  const {
    searchTerm,
    setSearchTerm,
    activeGroup,
    setActiveGroup,
    filteredPosts,
    groupNames,
    groupSlugMap,
  } = usePostFilter(posts, groups);

  const layoutClassName =
    layout === 'grid'
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-6'
      : layout === 'list'
        ? 'flex flex-col gap-4'
        : 'flex flex-col gap-2';

  const layoutToggle = (
    <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-zinc-200">
      {LAYOUT_OPTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleLayoutChange(key)}
          title={label}
          className={`p-2 rounded-lg transition-colors duration-200 ${
            layout === key
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <PostListHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        postCount={filteredPosts.length}
        t={t}
        rightExtra={layoutToggle}
      />

      <GroupTabs
        groupNames={groupNames}
        groupSlugMap={groupSlugMap}
        activeGroup={activeGroup}
        onSelect={setActiveGroup}
        t={t}
      />

      <div className={layoutClassName}>
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post, index) => (
            <PostListItem
              key={post.slug}
              post={post}
              index={index}
              coverConfig={coverConfig}
              locale={locale}
              t={t}
              compact={layout === 'compact'}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredPosts.length === 0 && <PostListEmptyState t={t} />}
    </div>
  );
}

export default PostListClient;
