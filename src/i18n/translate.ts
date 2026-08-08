/**
 * 翻译字典与同步翻译函数
 * 纯函数模块（无 React 依赖、无 'use client'），服务端与客户端均可导入
 */

import zhCN from '@/i18n/zh-CN.json';
import en from '@/i18n/en.json';
import type { TFunc } from './keys';

export type Locale = 'zh-CN' | 'en';

export interface I18nKeys {
  [key: string]: string | I18nKeys;
}

export const translations: Record<Locale, I18nKeys> = {
  'zh-CN': zhCN,
  'en': en,
};

/**
 * 公共键解析 — getTranslate 与 useI18n.t 复用同一实现，避免重复逻辑
 * key 缺失或路径无效时原样返回 key（调用方类型约束已保证合法，此处兜底运行时动态键）
 */
export function lookup(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const keys = key.split('.');
  let value: string | I18nKeys | undefined = translations[locale];

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

/**
 * 同步翻译函数 — 用于非 React 组件上下文（服务端组件、API 路由、模块级代码）
 * 默认使用 zh-CN，不支持运行时切换语言
 */
export const getTranslate: TFunc = (key, params) => lookup('zh-CN', key, params);