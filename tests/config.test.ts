/**
 * config.ts 单元测试
 *
 * 覆盖范围:
 * - matchPath: 通配符 '*'、脱字符 '^' 前缀、精确匹配
 * - canAccess: private/public 规则 x hasDb x isAuthenticated 全组合
 * - filterAccessibleSlugs: 批量过滤可访问 slug
 * - loadConfig: 缓存命中、文件不存在(默认值)、文件存在(正常/校验失败)
 * - getUserAvatar / getUserAvatarAsync: 头像获取
 * - clearConfigCache: 缓存清除
 *
 * mock 依赖: fs, js-yaml, @/lib/db
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mock 变量 ----
const mocks = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockReadFile: vi.fn(),
  mockYamlLoad: vi.fn(),
}));

// ---- mock fs ----
vi.mock('fs', () => ({
  default: {
    promises: {
      access: mocks.mockAccess,
      readFile: mocks.mockReadFile,
    },
  },
}));

// ---- mock js-yaml ----
vi.mock('js-yaml', () => ({
  default: {
    load: mocks.mockYamlLoad,
  },
}));

// ---- mock @/lib/db ----
vi.mock('@/lib/db', () => ({
  hasDatabase: vi.fn(() => true),
}));

// ---- import 被测模块 ----
import {
  matchPath,
  canAccess,
  filterAccessibleSlugs,
  loadConfig,
  clearConfigCache,
  getUserAvatar,
  getUserAvatarAsync,
} from '@/lib/config';

// ---- 辅助：构造 config 对象 ----
function makeConfig(overrides?: Record<string, unknown>) {
  return { site: { title: '' }, access: { posts: { public: [], private: [] }, faces: { public: [], private: [] }, diary: { public: [], private: [] } }, ...overrides };
}

// ---- 辅助：mock 文件不存在 ----
function mockFsNotExist() {
  mocks.mockAccess.mockImplementation(() => Promise.reject(new Error('ENOENT')));
}

// ---- 辅助：mock 文件存在 + YAML 内容 ----
function mockFsExist(raw: Record<string, unknown>) {
  mocks.mockAccess.mockImplementation(() => Promise.resolve(undefined));
  mocks.mockReadFile.mockImplementation(() => Promise.resolve('content'));
  mocks.mockYamlLoad.mockImplementation(() => raw);
}

// ---- 辅助：mock access 成功 + readFile 抛错 ----
function mockFsReadError() {
  mocks.mockAccess.mockImplementation(() => Promise.resolve(undefined));
  mocks.mockReadFile.mockImplementation(() => Promise.reject(new Error('读取失败')));
}

// ---- 辅助：mock access 成功 + YAML 校验失败 ----
function mockFsYamlInvalid() {
  mocks.mockAccess.mockImplementation(() => Promise.resolve(undefined));
  mocks.mockReadFile.mockImplementation(() => Promise.resolve('content'));
  mocks.mockYamlLoad.mockImplementation(() => ({ unknownField: true }));
}

// ---- beforeEach：确保每次测试都完全重置 mock ----
beforeEach(() => {
  clearConfigCache();
  mocks.mockAccess.mockReset();
  mocks.mockReadFile.mockReset();
  mocks.mockYamlLoad.mockReset();
});

// ============================================================================
// matchPath
// ============================================================================
describe('matchPath', () => {
  test('"*" 匹配任何目标', () => {
    expect(matchPath('*', '任意路径')).toBe(true);
    expect(matchPath('*', '')).toBe(true);
    expect(matchPath('*', 'a/b/c')).toBe(true);
  });

  test('脱字符 "^" 前缀匹配 — 目标恰好等于前缀', () => {
    expect(matchPath('^posts/draft', 'posts/draft')).toBe(true);
  });

  test('脱字符 "^" 前缀匹配 — 目标以 前缀/ 开头', () => {
    expect(matchPath('^posts/draft', 'posts/draft/2024')).toBe(true);
    expect(matchPath('^posts/draft', 'posts/draft/deep/nested')).toBe(true);
  });

  test('脱字符 "^" 前缀匹配 — 不匹配非前缀路径', () => {
    expect(matchPath('^posts/draft', 'posts/drafts')).toBe(false);
    expect(matchPath('^posts/draft', 'posts/other')).toBe(false);
    expect(matchPath('^posts/draft', 'other')).toBe(false);
    expect(matchPath('^posts/draft', '')).toBe(false);
  });

  test('脱字符 "^" 前缀为空字符串（pattern 为 "^"）', () => {
    expect(matchPath('^', '')).toBe(true);
    expect(matchPath('^', '/anything')).toBe(true);
    expect(matchPath('^', 'something')).toBe(false);
  });

  test('精确匹配 — 无通配符无脱字符', () => {
    expect(matchPath('about', 'about')).toBe(true);
    expect(matchPath('about', 'About')).toBe(false);
    expect(matchPath('about', 'about/me')).toBe(false);
    expect(matchPath('about', '')).toBe(false);
  });
});

// ============================================================================
// canAccess
// ============================================================================
describe('canAccess', () => {
  test('private 规则命中 + 无数据库 → false', async () => {
    mockFsExist({ access: { posts: { public: [], private: ['^secret'] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'secret/hello', true, false, config)).toBe(false);
  });

  test('private 规则命中 + 有数据库 + 已认证 → true', async () => {
    mockFsExist({ access: { posts: { public: [], private: ['^secret'] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'secret/hello', true, true, config)).toBe(true);
  });

  test('private 规则命中 + 有数据库 + 未认证 → false', async () => {
    mockFsExist({ access: { posts: { public: [], private: ['^secret'] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'secret/hello', false, true, config)).toBe(false);
  });

  test('public 规则命中 → 未认证也能访问', async () => {
    mockFsExist({ access: { posts: { public: ['^public'], private: [] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'public/intro', false, false, config)).toBe(true);
  });

  test('public 规则命中 + 已认证 → true', async () => {
    mockFsExist({ access: { posts: { public: ['^public'], private: [] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'public/intro', true, false, config)).toBe(true);
  });

  test('public 规则命中 + 有数据库 + 未认证 → true', async () => {
    mockFsExist({ access: { posts: { public: ['^public'], private: [] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'public/intro', false, true, config)).toBe(true);
  });

  test('既不在 private 也不在 public → 依赖认证状态', async () => {
    mockFsExist({ access: { posts: { public: [], private: [] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'other-path', true, false, config)).toBe(true);
    expect(await canAccess('posts', 'other-path', false, false, config)).toBe(false);
  });

  test('private 通配符 "*" 命中所有路径', async () => {
    mockFsExist({ access: { posts: { public: [], private: ['*'] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'anything', false, false, config)).toBe(false);
    expect(await canAccess('posts', 'anything', true, true, config)).toBe(true);
  });

  test('public 通配符 "*" 允许所有路径', async () => {
    mockFsExist({ access: { posts: { public: ['*'], private: [] } } });
    const config = await loadConfig();
    expect(await canAccess('posts', 'anything', false, false, config)).toBe(true);
  });

  test('private 优先级高于 public — 同时命中时 private 生效', async () => {
    mockFsExist({ access: { posts: { public: ['*'], private: ['*'] } } });
    const config = await loadConfig();
    // shared 同时在 public 和 private 中; private 先检查 → isPrivate=true
    expect(await canAccess('posts', 'shared', false, false, config)).toBe(false);
    expect(await canAccess('posts', 'shared', true, true, config)).toBe(true);
  });

  test('不同 section 独立运行', async () => {
    mockFsExist({
      access: {
        posts: { public: ['^open-post'], private: [] },
        faces: { public: [], private: ['*'] },
        diary: { public: [], private: ['^secret-diary'] },
      },
    });
    const config = await loadConfig();

    expect(await canAccess('posts', 'open-post/1', false, false, config)).toBe(true);
    expect(await canAccess('faces', 'any-face', false, false, config)).toBe(false);
    expect(await canAccess('diary', 'secret-diary/entry', false, true, config)).toBe(false);
    expect(await canAccess('diary', 'other-diary', false, false, config)).toBe(false);
  });

  test('canAccess 未传 config 时自动调用 loadConfig', async () => {
    mockFsNotExist();
    // 默认配置: 所有 section 的 public/private 都是空数组
    // 所以任何路径都不匹配 → 依赖 isAuthenticated
    expect(await canAccess('posts', 'some-slug', true, false)).toBe(true);
    expect(await canAccess('posts', 'some-slug', false, false)).toBe(false);
  });
});

// ============================================================================
// filterAccessibleSlugs
// ============================================================================
describe('filterAccessibleSlugs', () => {
  test('所有 slug 都可访问时返回全部（public: *）', async () => {
    mockFsExist({ access: { posts: { public: ['*'], private: [] } } });
    const result = await filterAccessibleSlugs('posts', ['a', 'b', 'c'], false);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('private 规则过滤 + 无数据库', async () => {
    mockFsExist({
      access: {
        posts: { public: ['^open'], private: ['^secret'] },
      },
    });
    const result = await filterAccessibleSlugs(
      'posts',
      ['open/intro', 'secret/draft', 'other'],
      false,
    );
    // open/intro → public '^open' 命中 → 可访问
    // secret/draft → private '^secret' 命中, hasDb=false → 不可访问
    // other → 无规则命中, isAuthenticated 固定为 false → 不可访问
    expect(result).toEqual(['open/intro']);
  });

  test('private 规则 + 有数据库 — filterAccessibleSlugs 固定传 isAuthenticated=false', async () => {
    mockFsExist({
      access: {
        posts: { public: [], private: ['^secret'] },
      },
    });
    const result = await filterAccessibleSlugs(
      'posts',
      ['secret/draft'],
      true,
    );
    expect(result).toEqual([]);
  });

  test('空 slug 列表返回空数组', async () => {
    mockFsExist(makeConfig());
    const result = await filterAccessibleSlugs('posts', [], false);
    expect(result).toEqual([]);
  });

  test('filterAccessibleSlugs 未传 hasDb 时默认 false', async () => {
    mockFsExist({ access: { posts: { public: [], private: ['^secret'] } } });
    const result = await filterAccessibleSlugs('posts', ['secret/data']);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// loadConfig
// ============================================================================
describe('loadConfig', () => {
  test('缓存命中 — 第二次调用不再读取文件', async () => {
    mockFsExist({ site: { title: 'Test' } });

    const first = await loadConfig();
    const second = await loadConfig();

    expect(first).toBe(second);
    expect(mocks.mockAccess).toHaveBeenCalledTimes(1);
    expect(mocks.mockReadFile).toHaveBeenCalledTimes(1);
  });

  test('文件不存在 → 返回默认配置', async () => {
    mockFsNotExist();
    const config = await loadConfig();
    expect(config.site.title).toBe('');
    expect(config.access.posts.public).toEqual([]);
    expect(mocks.mockReadFile).not.toHaveBeenCalled();
  });

  test('文件存在 + YAML 内容有效 → 返回解析结果', async () => {
    mockFsExist({ site: { title: 'My Blog' } });
    const config = await loadConfig();
    expect(mocks.mockYamlLoad).toHaveBeenCalled();
    expect(config.site.title).toBe('My Blog');
  });

  test('YAML 校验失败 → throw Error', async () => {
    mockFsYamlInvalid();
    await expect(loadConfig()).rejects.toThrow('config.yaml 校验失败');
  });

  test('fs.promises.access 成功后 readFile 抛错 → 异常传播', async () => {
    mockFsReadError();
    await expect(loadConfig()).rejects.toThrow('读取失败');
  });

  test('多次 loadConfig 只要不 clearCache 就只读一次文件', async () => {
    mockFsExist({});

    await loadConfig();
    await loadConfig();
    await loadConfig();

    expect(mocks.mockAccess).toHaveBeenCalledTimes(1);
    expect(mocks.mockReadFile).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// getUserAvatar / getUserAvatarAsync
// ============================================================================
describe('getUserAvatar', () => {
  test('avatar.url 有值时返回该值', async () => {
    mockFsExist({ avatar: { url: 'https://example.com/avatar.png' } });
    const url = await getUserAvatar();
    expect(url).toBe('https://example.com/avatar.png');
  });

  test('avatar.url 为空字符串时返回 null', async () => {
    mockFsExist(makeConfig());
    const url = await getUserAvatar();
    expect(url).toBeNull();
  });

  test('配置中无 avatar 字段时返回 null', async () => {
    mockFsExist(makeConfig());
    const url = await getUserAvatar();
    expect(url).toBeNull();
  });

  test('getUserAvatarAsync 是 getUserAvatar 的别名', () => {
    expect(getUserAvatarAsync).toBe(getUserAvatar);
  });
});

// ============================================================================
// clearConfigCache
// ============================================================================
describe('clearConfigCache', () => {
  test('清除缓存后 loadConfig 重新读取文件', async () => {
    mockFsExist({ site: { title: 'v1' } });
    const first = await loadConfig();
    expect(first.site.title).toBe('v1');

    clearConfigCache();

    mockFsExist({ site: { title: 'v2' } });
    const second = await loadConfig();
    expect(second.site.title).toBe('v2');
    expect(mocks.mockAccess).toHaveBeenCalledTimes(2);
  });

  test('多次 clearConfigCache 不会报错', () => {
    expect(() => {
      clearConfigCache();
      clearConfigCache();
      clearConfigCache();
    }).not.toThrow();
  });

  test('clearConfigCache 后返回新对象而非旧缓存引用', async () => {
    mockFsExist({ site: { title: 'first' } });
    const first = await loadConfig();

    clearConfigCache();

    mockFsExist({ site: { title: 'second' } });
    const second = await loadConfig();

    expect(first).not.toBe(second);
    expect(first.site.title).toBe('first');
    expect(second.site.title).toBe('second');
  });
});
