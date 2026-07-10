'use client';

import React, { useState, useEffect } from 'react';
import { ConfigProvider as AntdConfigProvider, theme, type ConfigProviderProps as AntdConfigProviderProps } from 'antd';
import { useI18n } from '@/hooks/use-i18n';

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
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  const { locale } = useI18n();
  const [antdLocale, setAntdLocale] = useState<AntdLocale | undefined>(undefined);

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
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1677ff',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
