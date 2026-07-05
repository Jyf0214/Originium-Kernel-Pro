'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { Tag } from '@/components/ui/Tag';
import { ProCard } from '@/components/ui/ProCard';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/ui';
import { EASE_STANDARD } from '@/components/ui/motion';

/** 标签统计信息 */
export interface TagStat {
  tag: string;
  count: number;
}

/** 帖子摘要信息 */
export interface PostSummary {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  tags: string[];
}

interface TagCloudClientProps {
  tagStats: TagStat[];
  posts: PostSummary[];
}

/**
 * 根据文章数量计算标签大小档位
 */
function getTagSize(count: number): 'sm' | 'md' | 'lg' {
  if (count >= 5) return 'lg';
  if (count >= 3) return 'md';
  return 'sm';
}

/**
 * 标签云客户端组件 — 交互式标签筛选与文章列表展示
 */
export function TagCloudClient({ tagStats, posts }: TagCloudClientProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  /* 过滤后的标签列表 */
  const filteredTags = useMemo(() => {
    if (!filter) return tagStats;
    const keyword = filter.toLowerCase();
    return tagStats.filter((t) => t.tag.toLowerCase().includes(keyword));
  }, [tagStats, filter]);

  /* 选中标签对应的文章列表 */
  const filteredPosts = useMemo(() => {
    if (!selectedTag) return [];
    return posts.filter((p) => p.tags.includes(selectedTag));
  }, [posts, selectedTag]);

  const handleTagClick = (tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  };

  return (
    <div className="space-y-8">
      {/* 标签过滤输入 */}
      <Input
        placeholder="搜索标签..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        size="md"
        rounded="full"
        className="max-w-sm"
      />

      {/* 标签云 */}
      {filteredTags.length === 0 ? (
        <EmptyState
          title="暂无标签"
          description={filter ? '没有匹配的标签' : '还没有标签'}
          variant="minimal"
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {filteredTags.map((item) => (
            <Tag
              key={item.tag}
              variant={selectedTag === item.tag ? 'dark' : 'light'}
              size={getTagSize(item.count)}
              onClick={() => handleTagClick(item.tag)}
              className={cn(
                'transition-all',
                selectedTag === item.tag && 'ring-2 ring-zinc-400 dark:ring-zinc-500',
              )}
            >
              {item.tag}
              <span className="ml-1 opacity-60">{item.count}</span>
            </Tag>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      <AnimatePresence mode="wait">
        {selectedTag && (
          <motion.div
            key={selectedTag}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE_STANDARD }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              标签「{selectedTag}」下的文章
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({filteredPosts.length} 篇)
              </span>
            </h2>

            {filteredPosts.length === 0 ? (
              <EmptyState
                title="暂无文章"
                description="该标签下没有文章"
                variant="minimal"
              />
            ) : (
              <div className="grid gap-4">
                {filteredPosts.map((post) => (
                  <ProCard key={post.slug} hoverable>
                    <Link
                      href={post.slug}
                      className="block group"
                    >
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                        {post.title}
                      </h3>
                      {post.date && (
                        <time className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block">
                          {post.date}
                        </time>
                      )}
                      {post.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">
                          {post.description}
                        </p>
                      )}
                    </Link>
                  </ProCard>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TagCloudClient;
