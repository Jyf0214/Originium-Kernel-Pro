import { describe, it, expect, beforeEach } from 'vitest';
import { getUserAvatar, loadConfig, clearConfigCache } from '@/lib/config';

describe('getUserAvatar 头像查找', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  it('uid 匹配时返回 users[uid].avatar', () => {
    const config = loadConfig();
    const users = config.users;
    if (users) {
      const firstUid = Object.keys(users)[0];
      if (firstUid && users[firstUid]?.avatar) {
        const result = getUserAvatar(firstUid, false);
        expect(result).toBe(users[firstUid].avatar);
      }
    }
  });

  it('isAdmin 且无 uid 匹配时返回 auth.admin.avatar', () => {
    const config = loadConfig();
    const result = getUserAvatar('nonexistent-uid', true);
    expect(result).toBe(config.auth?.admin?.avatar ?? null);
  });

  it('非 admin 且无 uid 匹配时返回 null', () => {
    const result = getUserAvatar('nonexistent-uid', false);
    expect(result).toBeNull();
  });
});
