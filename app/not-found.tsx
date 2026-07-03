'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchDialog } from '@/components/SearchDialog';
import { cn } from '@/lib/ui';
import { useConfig } from '@/hooks/use-config';

export interface NotFoundPost {
  title: string;
  slug: string;
}

interface NotFoundProps {
  recentPosts?: NotFoundPost[];
}

export default function NotFound({ recentPosts = [] }: NotFoundProps) {
  const { config } = useConfig();
  const errorImg = config?.errorImg?.postPage;
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-900">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          {/* 自定义 404 图片 */}
          {errorImg ? (
            <div
              className={cn(
                'mb-6 flex justify-center',
                'animate-[fadeSlideUp_0.5s_ease-out]'
              )}
            >
              <img
                src={errorImg}
                alt="404"
                className="w-48 h-48 object-contain drop-shadow-lg"
              />
            </div>
          ) : (
            <div
              className={cn(
                'mb-6 flex justify-center',
                'animate-[fadeSlideUp_0.5s_ease-out]'
              )}
            >
              <div className="text-8xl select-none">🌌</div>
            </div>
          )}

          {/* 404 大号数字 */}
          <h1
            className={cn(
              'text-8xl sm:text-9xl font-black text-zinc-200 dark:text-zinc-700 select-none',
              'animate-[fadeSlideUp_0.5s_ease-out_0.1s_both]'
            )}
          >
            404
          </h1>

          {/* 友好提示 */}
          <h2
            className={cn(
              'mt-4 text-xl sm:text-2xl font-bold text-zinc-800 dark:text-zinc-100',
              'animate-[fadeSlideUp_0.5s_ease-out_0.2s_both]'
            )}
          >
            页面走丢了
          </h2>
          <p
            className={cn(
              'mt-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto',
              'animate-[fadeSlideUp_0.5s_ease-out_0.3s_both]'
            )}
          >
            你要找的页面不存在，可能已被移除或地址有误。请检查链接是否正确，或返回首页继续浏览。
          </p>

          {/* 搜索框 + 热门文章 */}
          <div
            className={cn(
              'mt-8 flex flex-col sm:flex-row items-stretch justify-center gap-6 sm:gap-8',
              'animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]'
            )}
          >
            {/* 搜索按钮 */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <Button
                variant="secondary"
                size="lg"
                autoLoading={false}
                className="w-full sm:w-auto"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={16} />
                搜索文章
              </Button>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">输入关键词快速查找</span>
            </div>

            {/* 热门文章 */}
            {recentPosts.length > 0 && (
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  热门文章
                </span>
                <ul className="w-full space-y-1.5">
                  {recentPosts.slice(0, 5).map((post) => (
                    <li key={post.slug} className="min-w-0">
                      <Link
                        href={`/posts/${post.slug}`}
                        className={cn(
                          'group block px-3 py-1.5 rounded-lg text-sm truncate',
                          'text-zinc-600 dark:text-zinc-300',
                          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                          'hover:text-zinc-900 dark:hover:text-zinc-100',
                          'transition-colors duration-150'
                        )}
                      >
                        <span className="truncate">{post.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div
            className={cn(
              'mt-6 flex flex-col sm:flex-row items-center justify-center gap-3',
              'animate-[fadeSlideUp_0.5s_ease-out_0.5s_both]'
            )}
          >
            <Link href="/">
              <Button variant="primary" size="lg" autoLoading={false}>
                <Home size={16} />
                返回首页
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              autoLoading={false}
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={16} />
              返回上一页
            </Button>
          </div>
        </div>
      </main>

      {/* 搜索对话框 */}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* 渐入动画样式 */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
