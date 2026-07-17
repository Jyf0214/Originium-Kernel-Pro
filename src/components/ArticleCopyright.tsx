'use client';

import { useConfig } from '@/hooks/use-config';
import type { AuthorInfo } from '@/types/author';

interface ArticleCopyrightProps {
  authorName: string;
  authorUrl?: string;
  authorInfo?: AuthorInfo | null;
}

/** 作者详情行 */
function AuthorDetails({
  decodedName,
  authorHref,
  authorLink,
  authorUrl,
  nickname,
  location,
  license,
  licenseUrl,
  labels,
}: {
  decodedName: string;
  authorHref: string;
  authorLink: string;
  authorUrl?: string;
  nickname?: string;
  location?: string;
  license?: string;
  licenseUrl?: string;
  labels?: { authorPrefix: string; sourcePrefix: string; licensePrefix: string };
}) {
  const authorPrefix = labels?.authorPrefix ?? '作者: ';
  const sourcePrefix = labels?.sourcePrefix ?? '来源: ';
  const licensePrefix = labels?.licensePrefix ?? '许可: ';

  return (
    <div className="space-y-1">
      <p>
        <span className="text-zinc-400">{authorPrefix}</span>
        <a href={authorHref ?? authorLink ?? authorUrl ?? '/'} target="_blank" rel="noopener noreferrer" className="text-zinc-700 dark:text-zinc-200 font-medium hover:text-zinc-900 underline underline-offset-2 decoration-zinc-300">
          {nickname ?? decodedName}
        </a>
      </p>
      {location && <p><span className="text-zinc-400">{sourcePrefix}</span><span>{location}</span></p>}
      {license && (
        <p>
          <span className="text-zinc-400">{licensePrefix}</span>
          {licenseUrl ? (
            <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 underline underline-offset-2 decoration-zinc-300">{license}</a>
          ) : (
            <span>{license}</span>
          )}
        </p>
      )}
    </div>
  );
}

export default function ArticleCopyright({ authorName, authorUrl, authorInfo }: ArticleCopyrightProps) {
  const { config } = useConfig();
  const cfg = config?.copyright;

  if (!cfg?.enable) return null;

  const avatarUrl = authorInfo?.avatar ?? config?.avatar?.url;
  const decodedName = cfg.decode ? decodeURIComponent(authorName) : authorName;
  const sectionLabel = cfg.labels?.authorSection ?? '本文作者';

  return (
    <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-700">
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          {avatarUrl && <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
          <span className="font-bold text-zinc-700 dark:text-zinc-200">{sectionLabel}</span>
        </div>
        <AuthorDetails
          decodedName={decodedName}
          authorHref={cfg.authorHref}
          authorLink={cfg.authorLink}
          authorUrl={authorUrl}
          nickname={authorInfo?.nickname}
          location={authorInfo?.location}
          license={cfg.license}
          licenseUrl={cfg.licenseUrl}
          labels={cfg.labels}
        />
      </div>
    </div>
  );
}
