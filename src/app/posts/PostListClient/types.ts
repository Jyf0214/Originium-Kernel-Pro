import type { PostItem, CoverConfig } from '@/components/ui/PostCard';

export type { PostItem, CoverConfig } from '@/components/ui/PostCard';

export interface GroupItem {
  slug: string;
  title: string;
  description?: string;
  public: boolean;
  groupName?: string;
}

export interface PostListClientProps {
  posts: PostItem[];
  groups: GroupItem[];
  coverConfig?: CoverConfig;
}
