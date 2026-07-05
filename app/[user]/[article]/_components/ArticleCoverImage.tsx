'use client';

import { useState } from 'react';
import Image from 'next/image';

export function ArticleCoverImage({
  coverImage,
  title,
  mainColor,
  defaultCover,
  errorFallback,
}: {
  coverImage: string;
  title: string;
  mainColor?: string | null;
  defaultCover?: string;
  errorFallback?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [fallbackImgError, setFallbackImgError] = useState(false);

  const src = coverImage ?? defaultCover ?? '';
  if (!src) return null;

  return (
    <div
      className="w-full aspect-[21/9] rounded-3xl overflow-hidden bg-zinc-50 mb-16 relative"
      style={mainColor ? { boxShadow: `0 25px 50px -12px ${mainColor}40` } : { boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
    >
      {imgError && !fallbackImgError && errorFallback ? (
        <Image
          src={errorFallback}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          unoptimized
          onError={() => setFallbackImgError(true)}
        />
      ) : imgError || fallbackImgError ? (
        /* ⚠️ 禁止显示首字母 — 灰色占位块 */
        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700" aria-hidden />
      ) : (
        <Image
          src={src}
          alt={title}
          fill
          className="object-cover ui-interactive transition-transform duration-1000"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          unoptimized
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
