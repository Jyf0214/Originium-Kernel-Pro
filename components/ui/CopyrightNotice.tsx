'use client';

import Link from 'next/link';
import { cn } from '@/lib/ui';
import type { AuthorInfo } from '@/types/author';

export interface CopyrightNoticeProps {
  author: string;
  title: string;
  slug: string;
  type?: 'original' | 'reprint';
  config: {
    enable: boolean;
    license: string;
    licenseUrl: string;
    authorLink: string;
    authorImgFront?: string;
    location?: string;
    decode?: boolean;
  };
  locale?: string;
  /** 作者列表数据 — 优先级高于 config 中的静态字段 */
  authorInfo?: AuthorInfo | null;
}

function decodeHtml(text: string): string {
  if (typeof document === 'undefined') return text;
  const el = document.createElement('div');
  el.textContent = text;
  return el.textContent ?? text;
}

/** 作者信息行：头像 + 昵称 + 地点 + 签名 */
function AuthorInfoRow({
  displayAvatar,
  displayAuthor,
  displayLocation,
  bio,
  authorLink,
}: {
  displayAvatar?: string;
  displayAuthor: string;
  displayLocation?: string;
  bio?: string;
  authorLink: string;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={displayAuthor}
            className="rounded-full w-10 h-10 object-cover"
          />
        ) : (
          /* ⚠️ 禁止显示首字母 — 灰色占位块 */
          <div className="rounded-full w-10 h-10 bg-zinc-200 dark:bg-zinc-700 shrink-0" aria-hidden />
        )}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={authorLink}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors truncate"
          >
            {displayAuthor}
          </Link>
          {displayLocation && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{displayLocation}</span>
          )}
        </div>
      </div>
      {bio && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-4 -mt-1">{bio}</p>
      )}
    </>
  );
}

/** 许可证链接 */
function LicenseLink({ license, licenseUrl }: { license: string; licenseUrl: string }) {
  return (
    <a
      href={licenseUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline underline-offset-2 decoration-zinc-300 dark:decoration-zinc-600"
    >
      {license}
    </a>
  );
}

/** 版权声明文本 */
function CopyrightText({
  type,
  locale,
  license,
  licenseUrl,
}: {
  type: 'original' | 'reprint';
  locale?: string;
  license: string;
  licenseUrl: string;
}) {
  if (locale === 'en') {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Licensed under <LicenseLink license={license} licenseUrl={licenseUrl} />. All rights reserved.
      </p>
    );
  }
  return (
    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
      采用 <LicenseLink license={license} licenseUrl={licenseUrl} />
      {type === 'original'
        ? ' 许可协议。版权归作者所有，未经授权禁止转载。'
        : '，版权归原作者所有。'}
    </p>
  );
}

export function CopyrightNotice({
  author,
  title,
  slug: _slug,
  type = 'original',
  config,
  locale,
  authorInfo,
}: CopyrightNoticeProps) {
  if (!config.enable) return null;

  const displayAuthor = authorInfo?.nickname ?? (config.decode ? decodeHtml(author) : author);
  const displayTitle = config.decode ? decodeHtml(title) : title;
  const displayAvatar = authorInfo?.avatar ?? config.authorImgFront;
  const displayLocation = authorInfo?.location ?? config.location;

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 p-6">
      <AuthorInfoRow
        displayAvatar={displayAvatar}
        displayAuthor={displayAuthor}
        displayLocation={displayLocation}
        bio={authorInfo?.bio}
        authorLink={config.authorLink}
      />

      {/* 文章标题 + 原创/转载标识（移动端隐藏，避免与顶部标题重复） */}
      <div className="hidden sm:flex items-start gap-2 mb-3">
        <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed flex-1 min-w-0">
          {displayTitle}
        </h4>
        <span
          className={cn(
            'inline-flex items-center shrink-0 px-2 py-0.5 rounded-md text-xs font-medium',
            type === 'original'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
          )}
        >
          {type === 'original' ? '原创' : '转载'}
        </span>
      </div>

      {/* 许可证信息 */}
      {config.license && (
        <div className="mb-3">
          <LicenseLink license={config.license} licenseUrl={config.licenseUrl} />
        </div>
      )}

      {/* 版权声明文本 */}
      <CopyrightText type={type} locale={locale} license={config.license} licenseUrl={config.licenseUrl} />
    </div>
  );
}
