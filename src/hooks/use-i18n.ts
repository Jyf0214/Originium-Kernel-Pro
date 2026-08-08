'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { translations, lookup, type Locale } from '@/i18n/translate';
import type { TFunc } from '@/i18n/keys';
import { safeGetItem, safeSetItem } from '@/lib/local-storage';

/**
 * 获取当前语言的初始值
 * 浏览器端读取 localStorage 与浏览器语言，服务端回退 zh-CN
 */
function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const savedLocale = safeGetItem('locale') as Locale;
    if (savedLocale && translations[savedLocale]) {
      return savedLocale;
    }
    // 从浏览器检测语言
    const browserLocale = navigator.language;
    if (browserLocale.startsWith('zh')) return 'zh-CN';
    if (browserLocale.startsWith('en')) return 'en';
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
      safeSetItem('locale', newLocale);
      // 可选：更新 html lang 属性
      document.documentElement.lang = newLocale;
    }
  }, []);

  // 键解析复用 translate.ts 的 lookup，避免两处重复实现
  const t: TFunc = useCallback(
    (key, params) => lookup(locale, key, params),
    [locale],
  );

  return { locale, setLocale, t };
}