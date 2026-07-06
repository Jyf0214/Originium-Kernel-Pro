import { getContentIndexes, getContentFiles, filterPublicFiles } from '@/lib/content';

export interface RelatedPost {
  slug: string;
  title: string;
  date?: string;
  sharedTags: number;
}

export function getRelatedPosts(currentSlug: string, currentTags: string[] = [], limit = 4): RelatedPost[] {
  const pubIndexes = getContentIndexes('posts');
  const allPublicFiles = filterPublicFiles(getContentFiles('posts'), pubIndexes);

  return allPublicFiles
    .filter((f) => f.slug !== currentSlug)
    .map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      sharedTags: (f.meta.tags ?? []).filter((t) => currentTags.includes(t)).length,
    }))
    .filter((f) => f.sharedTags > 0)
    .sort((a, b) => b.sharedTags - a.sharedTags)
    .slice(0, limit);
}
