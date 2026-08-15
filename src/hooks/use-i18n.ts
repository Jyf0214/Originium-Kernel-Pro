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
  // 初始值必须与 SSR 一致（zh-CN）：
  // 若在 useState 初始化时读取 localStorage/navigator（客户端值），
  // 会与静态导出预渲染的 zh-CN HTML 产生 hydration mismatch，
  // React 将丢弃 SSR DOM 整树重建，导致页面加载时明显闪动
  const [locale, setLocaleState] = useState<Locale>('zh-CN');
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
  }, []);

  // 水合完成后应用用户偏好语言（localStorage 优先，其次浏览器语言）
  useEffect(() => {
    setLocaleState(getInitialLocale());
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