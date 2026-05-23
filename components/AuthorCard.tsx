'use client';

import { useConfig } from '@/hooks/use-config';
import { Avatar } from '@/components/Avatar';

interface AuthorCardProps {
  authorName: string;
  authorAvatar?: string;
  authorUrl?: string;
}

export default function AuthorCard({ authorName, authorAvatar, authorUrl }: AuthorCardProps) {
  const { config } = useConfig();
  const cfg = config?.authorStatus;

  if (!cfg?.enable) return null;

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100">
      <div className="bg-zinc-50 rounded-2xl p-6 flex items-start gap-4">
        <a
          href={authorUrl ?? '/'}
          className="shrink-0"
        >
          <Avatar name={authorName} avatarUrl={authorAvatar} size={56} />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={authorUrl ?? '/'}
            className="font-black text-zinc-900 hover:text-zinc-600 transition-colors"
          >
            {authorName}
          </a>
          {cfg.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cfg.skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
          {cfg.statusImg && (
            <div className="mt-3">
              <img
                src={cfg.statusImg}
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
