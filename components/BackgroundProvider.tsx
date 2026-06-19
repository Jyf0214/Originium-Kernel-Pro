'use client';

import { useEffect, useState, useRef } from 'react';
import type { AppearanceConfig } from '@/lib/config';

/**
 * 背景图提供组件
 * 优先从站点配置 API 读取，回退到数据库配置
 * 使用 React 状态管理替代直接 DOM 操作
 */
async function fetchBackgroundFromSiteConfig(mountedRef: { current: boolean }, setBackground: (bg: AppearanceConfig['background']) => void): Promise<boolean> {
  try {
    const res = await fetch('/api/site-config');
    if (res.ok) {
      const data = await res.json();
      if (data.appearance?.background?.url) {
        if (mountedRef.current) setBackground(data.appearance.background);
        return true;
      }
    } else {
      console.warn('背景配置获取失败:', res.status);
    }
  } catch (error) {
    console.error('背景配置加载失败:', error);
  }
  return false;
}

async function fetchBackgroundFromBackupConfig(mountedRef: { current: boolean }, setBackground: (bg: AppearanceConfig['background']) => void): Promise<void> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.appearance?.background?.url) {
        if (mountedRef.current) setBackground(data.appearance.background);
      } else if (data.background?.url) {
        if (mountedRef.current) setBackground(data.background);
      }
    } else {
      console.warn('备用背景配置获取失败:', res.status);
    }
  } catch (error) {
    console.error('背景配置加载失败:', error);
  }
}

function applyBackgroundStyles(url: string | undefined): void {
  if (!url) {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
    return;
  }
  // 验证 URL 格式，防止 CSS 注入
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && !url.startsWith('/')) {
      return;
    }
  } catch {
    // 非法 URL，跳过设置
    return;
  }
  document.body.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<AppearanceConfig['background'] | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const fetchConfig = async () => {
      const found = await fetchBackgroundFromSiteConfig(mountedRef, setBackground);
      if (!found) {
        await fetchBackgroundFromBackupConfig(mountedRef, setBackground);
      }
    };
    void fetchConfig();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    applyBackgroundStyles(background?.url);
    return () => {
      applyBackgroundStyles(undefined);
    };
  }, [background]);

  const opacity = background?.opacity ?? 0.8;

  return (
    <>
      {background?.url && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `rgba(255, 255, 255, ${opacity})`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
      {children}
    </>
  );
}
