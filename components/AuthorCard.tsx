'use client';

import { Avatar } from '@/components/Avatar';
import { Tag } from '@/components/ui/Tag';
import type { AuthorInfo } from '@/types/author';

interface AuthorCardProps {
  authorName: string;
  authorAvatar?: string;
  authorUrl?: string;
  /** 作者列表数据 — 用于技能标签和状态图片 */
  authorInfo?: AuthorInfo | null;
}

export default function AuthorCard({ authorName, authorAvatar, authorUrl, authorInfo }: AuthorCardProps) {
  if (!authorInfo?.enable) return null;

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 overflow-hidden">
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 flex items-start gap-4 overflow-hidden">
        <a
          href={authorUrl ?? '/'}
          className="shrink-0"
        >
          <Avatar name={authorName} avatarUrl={authorAvatar ?? authorInfo.avatar} size={56} />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={authorUrl ?? '/'}
            className="font-black text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            {authorInfo.nickname ?? authorName}
          </a>
          {authorInfo.skills && authorInfo.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {authorInfo.skills.map((skill, i) => (
                <Tag key={i} variant="outline" size="sm">{skill}</Tag>
              ))}
            </div>
          )}
          {authorInfo.statusImg && (
            <div className="mt-3">
              <img
                src={authorInfo.statusImg}
                alt="status"
                className="max-h-6 object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
