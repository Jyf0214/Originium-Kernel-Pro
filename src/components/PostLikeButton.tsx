'use client';

import { useState, useCallback, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION } from '@/components/ui/motion';
import { cn } from '@/lib/ui';
import { useI18n } from '@/hooks/use-i18n';
import { showError } from '@/lib/error';

interface PostLikeButtonProps {
  slug: string;
  initialCount?: number;
}

/** 静态导出子路径前缀（GitHub Pages /repo），根路径部署为空字符串 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** 静态导出模式下 /api 路由整体被移除，点赞接口不可用 */
const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

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
 * 静态导出模式下接口被移除，按钮禁用并提示不可用。
 */
export function PostLikeButton({ slug, initialCount = 0 }: PostLikeButtonProps) {
  const { t } = useI18n();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);

  // 初始化：从 localStorage 恢复点赞状态
  useEffect(() => {
    const likedSlugs = getLikedSlugs();
    setLiked(likedSlugs.has(slug));
  }, [slug]);

  const handleClick = useCallback(async () => {
    if (liked || IS_STATIC_EXPORT) return; // 已点赞或静态导出不允许点赞

    // 乐观更新
    setLiked(true);
    setCount((prev) => prev + 1);
    setAnimating(true);

    try {
      const res = await fetch(`${BASE_PATH}/api/posts/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setCount(data.count);
        // 服务端确认成功后才持久化到 localStorage
        const likedSlugs = getLikedSlugs();
        likedSlugs.add(slug);
        saveLikedSlugs(likedSlugs);
      } else {
        // 服务端拒绝（429/500 等）：回滚乐观状态，不保留假成功
        setLiked(false);
        setCount((prev) => Math.max(0, prev - 1));
        showError(t('components.PostLikeButton.likeFailed'));
      }
    } catch {
      // 网络错误：回滚乐观状态，不允许静默假成功
      setLiked(false);
      setCount((prev) => Math.max(0, prev - 1));
      showError(t('components.PostLikeButton.likeFailed'));
    }
  }, [liked, slug, t]);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={liked || IS_STATIC_EXPORT}
      whileTap={!liked && !IS_STATIC_EXPORT ? { scale: 1.2 } : undefined}
      animate={animating ? { scale: [1.2, 1] } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      onAnimationComplete={() => setAnimating(false)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors text-sm',
        liked
          ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500 cursor-default'
          : IS_STATIC_EXPORT
            ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 text-zinc-600 dark:text-zinc-300',
      )}
      title={liked ? t('components.PostLikeButton.liked') : IS_STATIC_EXPORT ? t('components.PostLikeButton.unavailable') : t('components.PostLikeButton.like')}
    >
      <Heart
        size={16}
        className={cn(
          'transition-colors',
          liked ? 'fill-red-500 text-red-500' : IS_STATIC_EXPORT ? 'fill-none text-zinc-400' : 'fill-none',
        )}
      />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: DURATION.MID }}
          className="font-medium tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
