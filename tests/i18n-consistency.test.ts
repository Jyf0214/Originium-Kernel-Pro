import { expect, test, describe } from 'vitest';
import en from '@/i18n/en.json';
import zhCN from '@/i18n/zh-CN.json';

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n 一致性', () => {
  test('en.json 和 zh-CN.json 应包含相同的 key 集合', () => {
    const enKeys = getAllKeys(en).sort();
    const zhKeys = getAllKeys(zhCN).sort();
    const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
    const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
    expect(missingInZh).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  test('en.json 不应包含空值', () => {
    const keys = getAllKeys(en);
    const emptyKeys = keys.filter(k => {
      const value = k.split('.').reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], en);
      return value === '' || value === undefined || value === null;
    });
    expect(emptyKeys).toEqual([]);
  });

  test('zh-CN.json 不应包含空值', () => {
    const keys = getAllKeys(zhCN);
    const emptyKeys = keys.filter(k => {
      const value = k.split('.').reduce((obj: unknown, key: string) => (obj as Record<string, unknown>)?.[key], zhCN);
      return value === '' || value === undefined || value === null;
    });
    expect(emptyKeys).toEqual([]);
  });
});
