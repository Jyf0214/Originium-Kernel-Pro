import { getContentFiles, getContentIndexes } from '@/lib/content';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { HeroBanner } from '@/components/ui/HeroBanner';
import { TagCloudClient, type TagStat, type PostSummary } from './TagCloudClient';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '标签 - Originium Kernel',
  description: '按标签浏览所有文章',
};

export const revalidate = 300; // 5 分钟 ISR

/**
 * 独立标签页 — 服务端组件，从文件系统读取帖子并提取标签
 */
export default function TagsPage() {
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅统计公开且未隐藏文章的标签（与首页、帖子列表页保持一致）
  const publicFiles = allFiles.filter((file) => {
    const isHidden = file.meta.hidden === true;
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find(
      (idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'),
    );
    const isPublic = dirIndex ? dirIndex.public : true;
    return isPublic && !isHidden;
  });

  /* 提取所有标签并统计数量 */
  const tagCountMap = new Map<string, number>();
  for (const file of publicFiles) {
    const tags = file.meta.tags;
    if (!Array.isArray(tags)) continue;
    for (const tag of tags) {
      if (typeof tag !== 'string' || !tag) continue;
      tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
    }
  }

  const tagStats: TagStat[] = Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  /* 构建帖子摘要列表 */
  const posts: PostSummary[] = publicFiles.map((f) => ({
    slug: f.slug,
    title: f.meta.title,
    date: f.meta.date,
    description: f.meta.description,
    tags: Array.isArray(f.meta.tags) ? f.meta.tags : [],
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white sm:bg-zinc-50 dark:bg-white sm:dark:bg-zinc-900">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 md:py-20">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            <Home size={14} />
          </Link>
          <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
          <Link href="/posts" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            帖子
          </Link>
          <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
          <span className="text-zinc-600 dark:text-zinc-300 font-medium">标签</span>
        </nav>

        {/* HeroBanner 横幅 */}
        <HeroBanner
          title="标签"
          description="按标签浏览文章"
          tips={`${tagStats.length} 个标签`}
          size="compact"
          align="center"
        />

        {/* 标签云 + 文章列表 */}
        <section className="mt-10">
          <TagCloudClient tagStats={tagStats} posts={posts} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
