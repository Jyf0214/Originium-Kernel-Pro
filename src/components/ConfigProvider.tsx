'use client';

import React, { useState, useEffect } from 'react';
import { ConfigProvider as AntdConfigProvider, theme, type ConfigProviderProps as AntdConfigProviderProps } from 'antd';
import { useI18n } from '@/hooks/use-i18n';
import { useThemeMode } from '@/hooks/use-theme-mode';

type AntdLocale = NonNullable<AntdConfigProviderProps['locale']>;

/** i18n locale → antd locale 动态加载器 */
const LOCALE_LOADERS: Record<string, () => Promise<{ default: AntdLocale }>> = {
  'zh-CN': () => import('antd/locale/zh_CN'),
  'en': () => import('antd/locale/en_US'),
};

interface ConfigProviderProps {
  children: React.ReactNode;
}

/**
 * AntD Config Provider — 根据 i18n 语言偏好动态加载对应语言包
 * 主题算法跟随站点 <html> 的 dark class（任意组件切换主题时经 MutationObserver 实时同步）
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  const { locale } = useI18n();
  const { isDark: initialDark } = useThemeMode();
  const [antdLocale, setAntdLocale] = useState<AntdLocale | undefined>(undefined);
  const [isDark, setIsDark] = useState(initialDark);

  // 监听 <html> 的 class 变化，确保 antd 主题与全站手动切换保持实时同步
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setIsDark(html.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loader = LOCALE_LOADERS[locale] ?? LOCALE_LOADERS['zh-CN']!;
    void loader().then((mod) => {
      if (!cancelled) setAntdLocale(mod.default);
    });
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <AntdConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#18181b',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#18181b',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'var(--font-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Card: {
            borderRadius: 12,
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Table: {
            borderRadius: 8,
          },
        },
      }}
    >
      {children}
    </AntdConfigProvider>
  );
}
