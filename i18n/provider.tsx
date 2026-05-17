'use client';

import { NextIntlClientProvider, useLocale } from 'next-intl';
import type { ReactNode } from 'react';

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  
  return (
    <NextIntlClientProvider locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
