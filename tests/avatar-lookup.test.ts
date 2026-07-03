import { describe, it, expect, beforeEach } from 'vitest';
import { getUserAvatar, loadConfig, clearConfigCache } from '@/lib/config';

describe('getUserAvatar 全局头像', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  it('返回 auth.admin.avatar', () => {
    const config = loadConfig();
    const result = getUserAvatar();
    expect(result).toBe(config.auth?.admin?.avatar);
  });

  it('无参数时始终返回全局头像（不依赖 uid/email）', () => {
    const result = getUserAvatar();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
