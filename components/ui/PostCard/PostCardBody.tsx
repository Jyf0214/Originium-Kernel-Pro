'use client';

import React from 'react';
import Link from 'next/link';
import { Pin, Calendar, Clock } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import { Avatar } from '@/components/Avatar';
import type { PostItem } from './types';

function PostCardBodyFooter({
  post,
  locale,
  t,
}: {
  post: PostItem;
  locale: string;
  t: (key: string) => string;
}) {
  return (
    <div className="mt-auto pt-3 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400 min-w-0">
      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
        <Avatar
          name={post.authorNickname ?? post.author ?? ''}
          avatarUrl={post.authorAvatar}
          size={20}
        />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate">
          {post.authorNickname ?? post.author ?? t('home.anonymous')}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 whitespace-nowrap">
        {post.readingTime && post.readingTime > 0 && (
          <span className="flex items-center gap-0.5">
            <Clock size={10} />
            <span>{post.readingTime}分钟</span>
          </span>
        )}
        {post.date && (
          <span className="flex items-center gap-0.5">
            <Calendar size={10} />
            <span>
              {new Date(post.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export const PostCardBody = React.memo(function PostCardBody({
  post,
  locale,
  t,
  position,
}: {
  post: PostItem;
  locale: string;
  t: (key: string) => string;
  position?: string;
}) {
  const bodyRoundClass =
    position === 'right' ? 'rounded-l-2xl sm:rounded-l-[2rem]' :
    position === 'left' ? 'rounded-r-2xl sm:rounded-r-[2rem]' :
    'rounded-b-2xl sm:rounded-b-[2rem]';

  return (
    <div className={`px-4 sm:px-5 py-3 sm:py-4 flex-1 flex flex-col overflow-hidden ${bodyRoundClass}`}>
      {post.pinned && (
        <div className="inline-flex items-center gap-1.5 mb-3 self-start bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 px-2.5 py-1 rounded-lg">
          <Pin size={10} className="text-amber-400/80" />
          <Tag size="xs" variant="dark">
            {t('home.pinned')}
          </Tag>
        </div>
      )}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.slice(0, 3).map((tag) => (
            <Tag key={tag} variant="light" size="md">
              {tag}
            </Tag>
          ))}
        </div>
      )}
      <Link href={`/posts${post.slug}`} className="block group/title">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2 leading-snug group-hover/title:text-zinc-600 dark:group-hover/title:text-zinc-300 transition-colors duration-200">
          {post.title}
        </h2>
      </Link>
      {post.description && (
        <p className="text-zinc-400 text-sm line-clamp-2 mb-3 leading-relaxed">
          {post.description}
        </p>
      )}
      <PostCardBodyFooter post={post} locale={locale} t={t} />
    </div>
  );
});
