'use client';

import { ConfigProvider } from '@/components/ConfigProvider';
import { BackgroundProvider } from '@/components/BackgroundProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <BackgroundProvider>
        {children}
      </BackgroundProvider>
    </ConfigProvider>
  );
}
