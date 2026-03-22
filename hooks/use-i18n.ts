'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import zhCN from '@/i18n/zh-CN.json';
import en from '@/i18n/en.json';

type Locale = 'zh-CN' | 'en';

const translations: Record<Locale, any> = {
  'zh-CN': zhCN,
  'en': en,
};

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && translations[savedLocale]) {
      return savedLocale;
    }
  }
  return 'zh-CN';
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  }, [locale]);

  return { locale, setLocale, t };
}
