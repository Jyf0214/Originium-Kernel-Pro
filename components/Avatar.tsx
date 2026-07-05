'use client';

/**
 * Avatar 组件 —— 仅渲染 <img>，不做任何自定义回退
 *
 * ⚠️ 严禁设计约束（不可违反）：
 * - 禁止显示用户姓名首字母（initials）作为头像替代
 * - 禁止显示灰色占位块作为头像替代
 * - 图片加载失败时，由浏览器原生显示 broken image 图标
 * - 首字母回退和灰色占位块均已被视为严重漏洞并全部移除
 */
import React, { useState, useEffect } from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  fallbackImg?: string;
}

export function Avatar({ name, avatarUrl, size = 32, fallbackImg }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // avatarUrl 变化时重置错误状态，允许重新加载
  useEffect(() => { setImgError(false); }, [avatarUrl]);
  useEffect(() => { setFallbackError(false); }, [fallbackImg]);

  const showFallback = imgError && fallbackImg && !fallbackError;
  const src = showFallback ? fallbackImg : avatarUrl;

  if (!src) return null;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-xl object-cover shrink-0 max-w-full"
      style={{ width: size, height: size }}
      onError={() => {
        if (showFallback) setFallbackError(true);
        else setImgError(true);
      }}
    />
  );
}
