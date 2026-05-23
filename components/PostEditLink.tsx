'use client';

import { useConfig } from '@/hooks/use-config';
import { useAuth } from '@/hooks/use-auth';
import { Edit3 } from 'lucide-react';

interface PostEditLinkProps {
  slug: string;
}

export default function PostEditLink({ slug }: PostEditLinkProps) {
  const { config } = useConfig();
  const { user } = useAuth();
  const isLoggedIn = user !== null;
  const cfg = config?.postEdit;

  if (!cfg?.enable) return null;

  const href = isLoggedIn
    ? `/editor/${slug}`
    : typeof cfg.github === 'string'
      ? `${cfg.github}${slug}.md`
      : null;

  if (!href) return null;

  return (
    <a
      href={href}
      target={isLoggedIn ? undefined : '_blank'}
      rel={isLoggedIn ? undefined : 'noopener noreferrer'}
      className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-900 transition-colors"
    >
      <Edit3 size={14} />
      <span>{isLoggedIn ? '编辑' : '在 GitHub 上编辑'}</span>
    </a>
  );
}
