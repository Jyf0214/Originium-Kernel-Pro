import { describe, it, expect } from 'vitest';
import { isDiaryPublic } from '@/lib/diary-access';

describe('isDiaryPublic', () => {
  it('默认私密（public 为空）时返回 false', () => {
    expect(isDiaryPublic({ public: [] })).toBe(false);
  });

  it('public 含 * 时整体公开', () => {
    expect(isDiaryPublic({ public: ['*'] })).toBe(true);
  });

  it('public 含 / 或 ^/ 时整体公开', () => {
    expect(isDiaryPublic({ public: ['/'] })).toBe(true);
    expect(isDiaryPublic({ public: ['^/'] })).toBe(true);
  });

  it('public 含具体路径（非根）时仍视为私密', () => {
    expect(isDiaryPublic({ public: ['/diary/2026'] })).toBe(false);
  });

  it('缺少配置或 public 非数组时返回 false', () => {
    expect(isDiaryPublic(null)).toBe(false);
    expect(isDiaryPublic(undefined)).toBe(false);
    expect(isDiaryPublic({})).toBe(false);
  });
});
