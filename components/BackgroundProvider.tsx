'use client';

import { useEffect, useState } from 'react';
import type { AppearanceConfig } from '@/lib/config';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { SITE_CONFIG } from '@/data/site-config';

function applyBackgroundStyles(url: string | undefined): void {
  if (!url) {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
    return;
  }
  document.body.style.backgroundImage = `url(${url})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<AppearanceConfig['background'] | null>(null);
  const { isDark } = useThemeMode();

  useEffect(() => {
    const bg = SITE_CONFIG.appearance?.background;
    if (bg?.url) setBackground(bg);
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
            background: isDark ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
      {children}
    </>
  );
}
