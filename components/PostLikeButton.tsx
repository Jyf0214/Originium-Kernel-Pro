'use client';

import { useState, useCallback, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/ui';

interface PostLikeButtonProps {
  slug: string;
  initialCount?: number;
}

/** 获取 localStorage 中已点赞的 slug 集合 */
function getLikedSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem('liked_slugs');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** 保存已点赞的 slug 集合到 localStorage */
function saveLikedSlugs(slugs: Set<string>) {
  try {
    localStorage.setItem('liked_slugs', JSON.stringify([...slugs]));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

/**
 * 文章点赞按钮
 *
 * 心形图标 + 点赞数，点击后心形变红 + 弹跳动画 + 数字滚动。
 * 客户端通过 localStorage 防止同一用户重复点赞。
 */
export function PostLikeButton({ slug, initialCount = 0 }: PostLikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);

  // 初始化：从 localStorage 恢复点赞状态
  useEffect(() => {
    const likedSlugs = getLikedSlugs();
    setLiked(likedSlugs.has(slug));
  }, [slug]);

  const handleClick = useCallback(async () => {
    if (liked) return; // 已点赞，不允许取消

    // 乐观更新
    setLiked(true);
    setCount((prev) => prev + 1);
    setAnimating(true);

    // 保存到 localStorage
    const likedSlugs = getLikedSlugs();
    likedSlugs.add(slug);
    saveLikedSlugs(likedSlugs);

    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      }
    } catch {
      // 网络错误时保留乐观更新状态
    }
  }, [liked, slug]);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={liked}
      whileTap={!liked ? { scale: 1.2 } : undefined}
      animate={animating ? { scale: [1.2, 1] } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      onAnimationComplete={() => setAnimating(false)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors text-sm',
        liked
          ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500 cursor-default'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 text-zinc-600 dark:text-zinc-300',
      )}
      title={liked ? '已点赞' : '点赞'}
    >
      <Heart
        size={16}
        className={cn(
          'transition-colors',
          liked ? 'fill-red-500 text-red-500' : 'fill-none',
        )}
      />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="font-medium tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
