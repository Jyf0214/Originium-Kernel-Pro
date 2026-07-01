'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/ui';
import { useConfig } from '@/hooks/use-config';

export default function NotFound() {
  const { config } = useConfig();
  const errorImg = config?.errorImg?.postPage;

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

          {/* 操作按钮 */}
          <div
            className={cn(
              'mt-8 flex flex-col sm:flex-row items-center justify-center gap-3',
              'animate-[fadeSlideUp_0.5s_ease-out_0.4s_both]'
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
