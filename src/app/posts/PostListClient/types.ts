import type { PostItem, CoverConfig } from '@/components/ui/PostCard';
import type { PostMetaDisplayConfig } from '@/lib/config-types';

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
  /** 列表页文章元信息显示配置（postMeta.page） */
  postMeta?: PostMetaDisplayConfig;
}
