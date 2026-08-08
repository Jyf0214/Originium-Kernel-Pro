/**
 * i18n 键的类型化工具模块
 *
 * 从 zh-CN 字典（结构权威）推导合法键联合类型：
 * - I18nKey：编译期约束所有 t()/getTranslate() 传键必须为字典中真实存在的键
 * - ALL_I18N_KEYS：运行时扁平键集合，供校验与测试复用
 */

import zhCN from './zh-CN.json';

type FlattenKeys<T, P extends string = ''> = {
  [K in keyof T]: T[K] extends string
    ? `${P}${K & string}`
    : T[K] extends object
      ? FlattenKeys<T[K], `${P}${K & string}.`>
      : never;
}[keyof T];

/** 全部合法 i18n 键的联合类型（推导自 zh-CN.json，en.json 键集合与之完全一致） */
export type I18nKey = FlattenKeys<typeof zhCN>;

/** i18n 翻译函数签名（客户端 useI18n 与服务端 getTranslate 共用） */
export type TFunc = (
  key: I18nKey,
  params?: Record<string, string | number>,
) => string;

/** 运行时全部合法键（扁平，与 en.json 键集合完全一致） */
export const ALL_I18N_KEYS: readonly string[] = (() => {
  const out: string[] = [];
  const walk = (obj: Record<string, unknown>, prefix = ''): void => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        out.push(key);
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v as Record<string, unknown>, key);
      }
    }
  };
  walk(zhCN);
  return out;
})();

/** 运行时校验：字符串是否为合法 i18n 键（用于外部数据传入键等动态场景） */
export function isI18nKey(key: string): key is I18nKey {
  return ALL_I18N_KEYS.includes(key);
}