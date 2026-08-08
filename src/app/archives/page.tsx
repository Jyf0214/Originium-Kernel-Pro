import { getContentFiles, getContentIndexes, filterPublicFiles } from '@/lib/content';
import { loadConfig } from '@/lib/config';
import { PageContainer } from '@/components/ui/PageContainer';
import { Tag } from '@/components/ui/Tag';
import { LazyImage } from '@/components/ui/LazyImage';
import Link from 'next/link';
import { getTranslate } from '@/i18n/translate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: getTranslate('app.archives.title'),
  description: getTranslate('app.archives.desc'),
};


interface YearGroup {
  year: number;
  posts: {
    slug: string;
    title: string;
    date: string;
    tags: string[];
    cover?: string;
  }[];
}

export default async function ArchivesPage() {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');
  const config = await loadConfig();

  // 仅展示 public 且未隐藏的帖子（与首页、帖子列表页保持一致）
  const publicFiles = filterPublicFiles(allFiles, indexes);

  // 提取 posts，只保留有日期的
  const posts = publicFiles
    .map((f) => ({
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date ?? '',
      tags: f.meta.tags ?? [],
      cover: typeof f.meta.cover === 'string' ? f.meta.cover : undefined,
    }))
    .filter((p) => p.date !== '');

  // 按年份分组
  const groups: YearGroup[] = [];
  const yearMap = new Map<number, YearGroup['posts']>();

  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (isNaN(year)) continue;
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(post);
  }

  for (const [year, yearPosts] of yearMap.entries()) {
    // 年份内按日期降序排列
    yearPosts.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
    groups.push({ year, posts: yearPosts });
  }

  // 年份降序排列
  groups.sort((a, b) => b.year - a.year);

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  // 归档封面缩略图：archivesEnable 开启时显示封面（文章封面缺失时回退到默认封面）
  const showCover = config.cover?.archivesEnable ?? true;
  const defaultCover = config.cover?.defaultCover?.[0];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <PageContainer maxWidth="4xl" padding="wide">
        <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-zinc-900 dark:text-zinc-100 mb-2">
          {getTranslate('app.archives.title')}
        </h1>
        <p className="text-zinc-400 dark:text-zinc-500 text-base mb-12">
          {getTranslate('app.archives.postCount', { count: posts.length })}
        </p>

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.year}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {group.year}
                </h2>
                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                  {getTranslate('app.archives.unit', { count: group.posts.length })}
                </span>
              </div>

              <div className="space-y-2">
                {group.posts.map((post) => (
                  <article
                    key={post.slug}
                    className="flex items-center gap-4 py-2 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                  >
                    {showCover && (post.cover ?? defaultCover) && (
                      <Link
                        href={`/posts${post.slug}`}
                        className="shrink-0 ui-interactive"
                        aria-label={post.title}
                      >
                        <LazyImage
                          src={post.cover ?? defaultCover!}
                          alt={post.title}
                          width={64}
                          height={44}
                          className="rounded-lg object-cover"
                        />
                      </Link>
                    )}
                    <time className="text-sm text-zinc-400 dark:text-zinc-500 font-mono shrink-0 w-10">
                      {formatShortDate(post.date)}
                    </time>
                    <Link
                      href={`/posts${post.slug}`}
                      className="text-zinc-800 hover:text-zinc-600 transition-colors font-medium truncate min-w-0"
                    >
                      {post.title}
                    </Link>
                    {post.tags.length > 0 && (
                      <div className="flex gap-1.5 ml-auto shrink-0">
                        {post.tags.map((tag) => (
                          <Tag key={tag} variant="light" size="sm">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <p className="text-zinc-400 dark:text-zinc-500 text-center py-16">
              {getTranslate('app.archives.empty')}
            </p>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
