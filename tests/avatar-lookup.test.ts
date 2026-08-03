/**
 * getUserAvatar 单元测试
 *
 * 覆盖范围:
 * - getUserAvatar 返回全局头像 URL
 * - 无参数调用时返回全局配置头像
 *
 * 数据隔离: 通过 mock fs 注入固定 config.yaml 数据，
 * 不读取仓库真实的 config.yaml，避免测试依赖配置文件内容。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── fs mock：注入固定 config.yaml 内容 ──
const fsMock = vi.hoisted(() => ({
  promises: {
    access: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('avatar:\n  url: /avatar.jpg\n'),
  },
}));

vi.mock('fs', () => ({
  default: {
    promises: fsMock.promises,
  },
  promises: fsMock.promises,
}));

import { getUserAvatar, loadConfig, clearConfigCache } from '@/lib/config';

describe('getUserAvatar 全局头像', () => {
  beforeEach(() => {
    clearConfigCache();
    vi.restoreAllMocks();
    fsMock.promises.access.mockReset().mockResolvedValue(undefined);
    fsMock.promises.readFile.mockReset().mockResolvedValue('avatar:\n  url: /avatar.jpg\n');
  });

  it('始终返回 avatar.url', async () => {
    const config = await loadConfig();
    const result = await getUserAvatar();
    expect(result).toBe(config.avatar?.url || null);
  });

  it('无参数时始终返回全局头像', async () => {
    const result = await getUserAvatar();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});