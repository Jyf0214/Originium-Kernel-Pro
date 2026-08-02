/**
 * 翻译字典与同步翻译函数
 * 纯函数模块（无 React 依赖、无 'use client'），服务端与客户端均可导入
 */

import zhCN from '@/i18n/zh-CN.json';
import en from '@/i18n/en.json';

export type Locale = 'zh-CN' | 'en';

export interface I18nKeys {
  [key: string]: string | I18nKeys;
}

export const translations: Record<Locale, I18nKeys> = {
  'zh-CN': zhCN,
  'en': en,
};

/**
 * 同步翻译函数 — 用于非 React 组件上下文（服务端组件、API 路由、模块级代码）
 * 默认使用 zh-CN，不支持运行时切换语言
 */
export function getTranslate(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: string | I18nKeys | undefined = translations['zh-CN'];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  if (typeof value === 'string') {
    if (params) {
      let result = value;
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
      return result;
    }
    return value;
  }

  return key;
}
