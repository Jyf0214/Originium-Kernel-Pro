'use client';

import React, { useState, useEffect } from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  fallbackImg?: string;
}

/**
 * 头像组件 — 使用原生 <img> 渲染
 *
 * 原因：next/image 在 Next.js 16 中对外部 URL 的 unoptimized 处理存在不确定性，
 * 原生 <img> 更可靠且无需 remotePatterns 配置。
 */
export function Avatar({ name, avatarUrl, size = 32, fallbackImg }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // avatarUrl 变化时重置错误状态，允许重新加载
  useEffect(() => { setImgError(false); }, [avatarUrl]);
  useEffect(() => { setFallbackError(false); }, [fallbackImg]);

  const showFallback = imgError && fallbackImg && !fallbackError;

  if (avatarUrl && !imgError) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 overflow-hidden shrink-0 max-w-full"
        style={{ width: size, height: size }}
      >
        <img
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (showFallback) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 overflow-hidden shrink-0 max-w-full"
        style={{ width: size, height: size }}
      >
        <img
          src={fallbackImg}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setFallbackError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl bg-zinc-100 shrink-0 max-w-full"
      style={{ width: size, height: size }}
    />
  );
}
