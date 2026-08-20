/**
 * footer-config.ts 单元测试
 *
 * 覆盖范围:
 * - resolveDefaults: typedText 空数组 = 关闭打字机（不再回退默认三条）
 * - resolveDefaults: typedText 未定义时回退默认三条
 * - resolveDefaults: typedText 有值时原样返回
 * - resolveDefaults: customText 透传
 *
 * mock 依赖: @/data/site-config（构建时生成，resolveDefaults 不依赖其内容）
 */

import { describe, test, expect, vi } from 'vitest';

vi.mock('@/data/site-config', () => ({
  FOOTER_CONFIG: null,
  SOCIAL_DATA: null,
}));

import { resolveDefaults, DEFAULT_FOOTER_TYPED_TEXTS } from '@/components/Footer/footer-config';

const baseConfig = {
  owner: { enable: true, since: 2026 },
  customText: '',
  runtime: { enable: false, launchTime: '' },
};

describe('resolveDefaults', () => {
  test('typedText 为空数组时返回空数组（关闭打字机，不回退默认）', () => {
    const result = resolveDefaults({ ...baseConfig, typedText: [] });
    expect(result.typedText).toEqual([]);
  });

  test('typedText 未定义时回退默认三条', () => {
    const result = resolveDefaults(baseConfig);
    expect(result.typedText).toEqual(DEFAULT_FOOTER_TYPED_TEXTS);
    expect(result.typedText.length).toBeGreaterThan(0);
  });

  test('typedText 有值时原样返回', () => {
    const texts = ['自定义文字'];
    const result = resolveDefaults({ ...baseConfig, typedText: texts });
    expect(result.typedText).toEqual(texts);
  });

  test('customText 透传', () => {
    const result = resolveDefaults({ ...baseConfig, customText: '自定义版权文字' });
    expect(result.customText).toBe('自定义版权文字');
  });
});