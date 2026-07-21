// SearchTags - 搜索初始状态：提示语 + 热门标签快速筛选
// 标签数据从 /data/popular-tags.json 动态加载，该文件在构建时由 generate-search-index.mjs 生成

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

/** 热门标签条目类型 */
interface PopularTag {
  tag: string;
  count: number;
}

/** 降级默认标签（当热门标签文件加载失败时使用） */
const FALLBACK_TAGS = ['随笔', '旅行', '日常', '北京', '私密'];

interface SearchTagsProps {
  onTagClick: (tag: string) => void;
}

export function SearchTags({ onTagClick }: SearchTagsProps) {
  const [tags, setTags] = useState<string[]>(FALLBACK_TAGS);

  useEffect(() => {
    fetch('/data/popular-tags.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PopularTag[]>;
      })
      .then((data) => {
        // 从统计结果中提取标签名称，至少保留一个标签
        const tagNames = data.map((item) => item.tag).filter(Boolean);
        if (tagNames.length > 0) {
          setTags(tagNames);
        }
      })
      .catch(() => {
        // 加载失败时保持默认标签，静默处理
      });
  }, []);

  return (
    <div className="py-8 px-6">
      <p className="text-sm text-zinc-400 mb-4 text-center">
        输入关键词搜索文章内容，或点击热门标签快速筛选
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <Button
            key={tag}
            variant="ghost"
            size="sm"
            rounded="full"
            onClick={() => onTagClick(tag)}
            autoLoading={false}
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
