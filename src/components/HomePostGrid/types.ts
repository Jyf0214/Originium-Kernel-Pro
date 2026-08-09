import type { PostItem, CoverConfig } from '@/components/ui/PostCard';
import type { PostMetaDisplayConfig } from '@/lib/config-types';

export type { PostItem, CoverConfig } from '@/components/ui/PostCard';

export interface HomePostGridProps {
  posts: PostItem[];
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  defaultCover?: string;
  coverConfig?: CoverConfig;
  /** 列表页文章元信息显示配置（postMeta.page） */
  postMeta?: PostMetaDisplayConfig;
  /** 公开文章总数（快捷入口卡片展示用） */
  postCount?: number;
  /** 联系人总数（快捷入口卡片展示用，仅管理员可见） */
  facesCount?: number;
}
