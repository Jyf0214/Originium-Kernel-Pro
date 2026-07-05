'use client';

import { ArrowUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { EASE_STANDARD } from '@/components/ui/motion';
import { cn } from '@/lib/ui';
import type { AuthorInfo } from '@/types/author';

export interface PostSidebarCardProps {
  authorInfo?: AuthorInfo | null;
  wordCount: number;
  readingTime: number;
  date?: string;
  tags?: string[];
  onScrollToTop?: () => void;
}

/** 右侧浮动信息卡片 — 桌面端固定在文章右侧，移动端隐藏 */
export function PostSidebarCard({
  authorInfo,
  wordCount,
  readingTime,
  date,
  tags,
  onScrollToTop,
}: PostSidebarCardProps) {
  const displayName = authorInfo?.nickname ?? authorInfo?.name;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE_STANDARD }}
      className={cn(
        'sticky top-24 bg-white dark:bg-zinc-800',
        'rounded-2xl border border-zinc-100 dark:border-zinc-700',
        'p-5 shadow-sm w-full',
      )}
    >
      {/* 作者信息 */}
      {displayName && (
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-700">
          {authorInfo?.avatar && (
            <img
              src={authorInfo.avatar}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-700"
            />
          )}
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {displayName}
          </span>
        </div>
      )}

      {/* 文章统计 */}
      <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        <div className="flex justify-between">
          <span>字数</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{wordCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>阅读时间</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{readingTime} 分钟</span>
        </div>
        {date && (
          <div className="flex justify-between">
            <span>发布日期</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{date}</span>
          </div>
        )}
      </div>

      {/* 标签列表 */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-700">
          {tags.map((tag) => (
            <Tag key={tag} variant="light" size="xs">{tag}</Tag>
          ))}
        </div>
      )}

      {/* 回到顶部 */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<ArrowUp size={16} />}
          onClick={onScrollToTop}
          aria-label="回到顶部"
        />
      </div>
    </motion.aside>
  );
}
