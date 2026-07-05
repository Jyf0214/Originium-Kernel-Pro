import { getContentFiles, getContentIndexes } from '@/lib/content';
import { loadConfig } from '@/lib/config';
import { getAuthorByName } from '@/lib/authors';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { PostListClient } from './PostListClient';
import PostNavigation from '@/components/PostNavigation';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '帖子 - Originium Kernel',
  description: '浏览所有公开帖子',
};

export const revalidate = 300; // 5 分钟 ISR

/**
 * 帖子列表页 — 服务端组件，直接从文件系统读取
 * 仅展示 public 内容，不查数据库
 */
export default function PostsPage() {
  const config = loadConfig();
  const allFiles = getContentFiles('posts');
  const indexes = getContentIndexes('posts');

  // 仅展示 public 的帖子
  const publicFiles = allFiles.filter((file) => {
    const dirSlug = '/' + file.slug.split('/').filter(Boolean).slice(0, -1).join('/');
    const dirIndex = indexes.find((idx) => idx.slug === dirSlug || (dirSlug === '/' && idx.slug === '/'));
    return dirIndex ? dirIndex.public : true;
  });

  const publicIndexes = indexes.filter((idx) => idx.public);

  const posts = publicFiles.map((f) => {
    const authorName = typeof f.meta.author === 'string' ? f.meta.author : '';
    const authorInfo = getAuthorByName(authorName);
    return {
      slug: f.slug,
      title: f.meta.title,
      date: f.meta.date,
      author: f.meta.author,
      authorAvatar: authorInfo?.avatar,
      authorNickname: authorInfo?.nickname,
      tags: f.meta.tags ?? [],
      cover: f.meta.cover,
      description: f.meta.description,
      pinned: f.meta.pinned === true,
    };
  });

  const groups = publicIndexes.map((idx) => ({
    slug: idx.slug,
    title: idx.title,
    description: idx.description,
    public: idx.public,
    groupName: idx.groupName,
  }));

  // 构建服务端预渲染的导航树（从目录索引转换）
  const navigationTree = publicIndexes.map((idx) => ({
    slug: idx.slug.replace(/^\//, ''),
    title: idx.title,
    description: idx.description ?? '',
    icon: '',
    order: 0,
    public: idx.public,
    children: [],
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white sm:bg-zinc-50 dark:bg-white sm:dark:bg-zinc-900">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 md:py-20">
        {/* 面包屑导航 */}
        <nav className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            <Home size={14} />
          </Link>
          <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
          <span className="text-zinc-600 dark:text-zinc-300 font-medium">帖子</span>
        </nav>

        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-zinc-900 dark:text-zinc-100 mb-4">
          {config.site.title}
        </h1>
        <p className="text-zinc-400 dark:text-zinc-500 text-lg mb-12">{config.site.description}</p>
        <div className="flex gap-8 items-start">
          <PostNavigation initialTree={navigationTree} />
          <div className="flex-1 min-w-0">
            <PostListClient posts={posts} groups={groups} coverConfig={config.cover} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
