import { useMemo, useState } from 'react';
import type { PostItem, GroupItem } from './types';

export function usePostFilter(posts: PostItem[], groups: GroupItem[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const groupSlugMap = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach((g) => {
      if (g.groupName) m.set(g.groupName, g.slug);
    });
    return m;
  }, [groups]);

  const groupNames = useMemo(() => Array.from(groupSlugMap.keys()), [groupSlugMap]);

  const filteredPosts = useMemo(() => {
    const matched = posts.filter((p) => {
      const matchesSearch = !searchTerm ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGroup = !activeGroup ||
        p.slug.startsWith(activeGroup === '/' ? '/' : activeGroup + '/');
      return matchesSearch && matchesGroup;
    });
    // 置顶文章排在最前面，其余保持原有顺序（按日期降序）
    return [...matched].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [posts, searchTerm, activeGroup]);

  return {
    searchTerm,
    setSearchTerm,
    activeGroup,
    setActiveGroup,
    filteredPosts,
    groupNames,
    groupSlugMap,
  };
}
