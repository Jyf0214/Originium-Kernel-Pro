'use client';

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

interface CategoryBarProps {
  tags?: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

/**
 * 统一标签筛选栏 — 标签横向滚动筛选
 * 位于 hero 标题下方，支持鼠标滚轮水平滚动
 */
export function CategoryBar({
  tags = [],
  selectedTag,
  onSelectTag,
}: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm p-1.5">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-1.5 overflow-x-auto py-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* 全部按钮：重置所有筛选 */}
        <Button
          onClick={() => { onSelectTag(null); }}
          variant={selectedTag === null ? 'primary' : 'ghost'}
          size="sm"
          autoLoading={false}
          rounded="full"
          className={`shrink-0${selectedTag === null ? ' shadow-sm' : ''}`}
        >
          全部
        </Button>

        {/* 标签按钮 */}
        {tags.length > 0 && (
          <>
            <div className="shrink-0 w-px bg-zinc-200 my-1.5" aria-hidden="true" />
            {tags.map((tag) => (
              <Button
                key={`tag-${tag}`}
                onClick={() => {
                  onSelectTag(selectedTag === tag ? null : tag);
                }}
                variant={selectedTag === tag ? 'primary' : 'ghost'}
                size="sm"
                autoLoading={false}
                rounded="full"
                className={`shrink-0${selectedTag === tag ? ' shadow-sm' : ''}`}
              >
                #{tag}
              </Button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
