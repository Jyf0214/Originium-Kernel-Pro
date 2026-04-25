'use client';

import { useEffect, useState, useRef } from 'react';

interface BackgroundConfig {
  url?: string;
  opacity?: number;
}

/**
 * 背景图提供组件
 * 优先从站点配置 API 读取，回退到数据库配置
 * 使用 React 状态管理替代直接 DOM 操作
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<BackgroundConfig | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/site-config');
        if (res.ok) {
          const data = await res.json();
          if (data.appearance?.background?.url) {
            if (mountedRef.current) setBackground(data.appearance.background);
            return;
          }
        }
      } catch {
        // 忽略
      }

      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.appearance?.background?.url) {
            if (mountedRef.current) setBackground(data.appearance.background);
          } else if (data.background?.url) {
            if (mountedRef.current) setBackground(data.background);
          }
        }
      } catch {
        // 忽略
      }
    };
    fetchConfig();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!background?.url) {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
      return;
    }

    document.body.style.backgroundImage = `url(${background.url})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';

    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
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
