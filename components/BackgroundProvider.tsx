'use client';

import { useEffect, useState } from 'react';

interface BackgroundConfig {
  url?: string;
  opacity?: number;
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<BackgroundConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.background) {
            setBackground(data.background);
          }
        }
      } catch (error) {
        console.error('获取背景配置失败:', error);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    if (!background?.url) {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
      
      const overlay = document.getElementById('background-overlay');
      if (overlay) overlay.remove();
      return;
    }

    // 设置背景图片
    document.body.style.backgroundImage = `url(${background.url})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';

    // 创建蒙板
    let overlay = document.getElementById('background-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'background-overlay';
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    
    const opacity = background.opacity ?? 0.8;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, ${opacity});
      pointer-events: none;
      z-index: -1;
    `;

    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
      const overlay = document.getElementById('background-overlay');
      if (overlay) overlay.remove();
    };
  }, [background]);

  return <>{children}</>;
}
