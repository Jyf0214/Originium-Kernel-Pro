import type { PostItem, CoverConfig } from '@/components/ui/PostCard';

export type { PostItem, CoverConfig } from '@/components/ui/PostCard';

export interface HomePostGridProps {
  posts: PostItem[];
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  defaultCover?: string;
  coverConfig?: CoverConfig;
}
