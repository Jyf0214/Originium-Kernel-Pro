/**
 * authors.ts 单元测试
 *
 * 覆盖范围:
 * - getAuthors 正常解析作者列表
 * - getAuthors YAML 文件不存在时返回空数组
 * - getAuthors YAML 非数组时返回空数组
 * - getAuthors 过滤无效条目（无 name 字段）
 * - getAuthors 字段类型安全（非字符串字段被忽略）
 * - getAuthorByName 精确匹配
 * - getAuthorByName 未匹配时回退到 __default__ 条目
 * - getAuthorByName 无 __default__ 且无匹配时返回 null
 * - getAuthorByName 空字符串返回 null
 * - 缓存行为（连续调用不重新读取文件）
 *
 * 数据隔离: 通过 mock fs 与 mock js-yaml 注入固定数据，
 * 不读取仓库真实的 authors/authors.yaml，也不加载 node_modules 中的
 * js-yaml 真实实现，避免测试依赖配置文件内容与依赖包文件完整性。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';

/** mock js-yaml 的解析入口，由各用例直接控制返回值 */
const mocks = vi.hoisted(() => ({
  mockYamlLoad: vi.fn(),
}));

vi.mock('js-yaml', () => ({
  default: { load: mocks.mockYamlLoad },
}));

/** 固定作者数据（与真实配置结构等价，仅作测试夹具） */
const mockAuthors = [
  { name: '__default__', avatar: '/avatar.jpg', enable: true },
  { name: 'Jyf0214', nickname: '九月风', avatar: 'https://avatars.githubusercontent.com/u/169313142?v=4', location: '中国', enable: true },
];

/** 注入固定的作者解析结果 */
function mockAuthorsFile(data: unknown = mockAuthors) {
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs, 'readFileSync').mockReturnValue('(mocked yaml)');
  mocks.mockYamlLoad.mockReturnValue(data);
}

// 重置模块缓存，避免测试间缓存泄漏
beforeEach(() => {
  vi.resetModules();
});

describe('getAuthors', () => {
  it('应解析出作者列表', async () => {
    mockAuthorsFile();
    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(Array.isArray(authors)).toBe(true);
    expect(authors.length).toBeGreaterThan(0);
    // 固定数据中包含 __default__ 和 Jyf0214 两个条目
    const names = authors.map((a) => a.name);
    expect(names).toContain('__default__');
    expect(names).toContain('Jyf0214');
    vi.restoreAllMocks();
  });

  it('作者条目应包含 nickname 和 avatar 字段', async () => {
    mockAuthorsFile();
    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    const jyf = authors.find((a) => a.name === 'Jyf0214');
    expect(jyf).toBeDefined();
    expect(jyf?.nickname).toBe('九月风');
    expect(jyf?.avatar).toBeTruthy();
    vi.restoreAllMocks();
  });

  it('__default__ 条目的 avatar 应为 /avatar.jpg', async () => {
    mockAuthorsFile();
    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    const def = authors.find((a) => a.name === '__default__');
    expect(def).toBeDefined();
    expect(def?.avatar).toBe('/avatar.jpg');
    vi.restoreAllMocks();
  });

  it('应过滤无 name 字段的条目', async () => {
    // 注入包含无效条目的解析结果
    mockAuthorsFile([
      { name: 'valid', nickname: 'V' },
      { nickname: 'no-name' },
      { name: 'also-valid' },
    ]);

    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(authors.length).toBe(2);
    expect(authors.map((a) => a.name)).toEqual(['valid', 'also-valid']);

    vi.restoreAllMocks();
  });

  it('非字符串字段应被安全忽略', async () => {
    mockAuthorsFile([
      { name: 'test', nickname: 123, avatar: true, location: null, skills: 'not-array' },
    ]);

    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(authors.length).toBe(1);
    expect(authors[0]?.nickname).toBeUndefined();
    expect(authors[0]?.avatar).toBeUndefined();
    expect(authors[0]?.location).toBeUndefined();
    expect(authors[0]?.skills).toBeUndefined();

    vi.restoreAllMocks();
  });

  it('skills 数组中非字符串元素应被过滤', async () => {
    mockAuthorsFile([
      { name: 'skiller', skills: ['React', 42, 'TypeScript', null] },
    ]);

    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(authors[0]?.skills).toEqual(['React', 'TypeScript']);

    vi.restoreAllMocks();
  });
});

describe('getAuthors — 缓存行为', () => {
  it('连续调用应返回同一引用（缓存生效）', async () => {
    mockAuthorsFile();
    const { getAuthors } = await import('@/lib/authors');
    const a = getAuthors();
    const b = getAuthors();
    expect(a).toBe(b);
    vi.restoreAllMocks();
  });
});

describe('getAuthorByName', () => {
  it('应精确匹配已知作者', async () => {
    mockAuthorsFile();
    const { getAuthorByName } = await import('@/lib/authors');
    const author = getAuthorByName('Jyf0214');
    expect(author).not.toBeNull();
    expect(author?.name).toBe('Jyf0214');
    expect(author?.nickname).toBe('九月风');
    vi.restoreAllMocks();
  });

  it('未匹配时应回退到 __default__ 条目', async () => {
    mockAuthorsFile();
    const { getAuthorByName } = await import('@/lib/authors');
    const author = getAuthorByName('UnknownAuthor');
    expect(author).not.toBeNull();
    expect(author?.name).toBe('__default__');
    expect(author?.avatar).toBe('/avatar.jpg');
    vi.restoreAllMocks();
  });

  it('空字符串应返回 null', async () => {
    const { getAuthorByName } = await import('@/lib/authors');
    expect(getAuthorByName('')).toBeNull();
  });

  it('无 __default__ 条目且无匹配时返回 null', async () => {
    mockAuthorsFile([{ name: 'only-one', nickname: 'Solo' }]);

    const { getAuthorByName } = await import('@/lib/authors');
    const author = getAuthorByName('nonexistent');
    expect(author).toBeNull();

    vi.restoreAllMocks();
  });

  it('大小写敏感匹配', async () => {
    mockAuthorsFile();
    const { getAuthorByName } = await import('@/lib/authors');
    // 固定数据中 name 为 "Jyf0214"，大小写不同应不匹配并回退到 __default__
    expect(getAuthorByName('jyf0214')).not.toBeNull();
    expect(getAuthorByName('JYF0214')).not.toBeNull();
    vi.restoreAllMocks();
  });
});

describe('getAuthors — 异常情况', () => {
  it('YAML 文件不存在时返回空数组', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const { getAuthors } = await import('@/lib/authors');
    expect(getAuthors()).toEqual([]);
    vi.restoreAllMocks();
  });

  it('YAML 内容非数组时返回空数组', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('(mocked yaml)');
    // 解析结果不是数组
    mocks.mockYamlLoad.mockReturnValue({ key: 'value', other: 'data' });
    const { getAuthors } = await import('@/lib/authors');
    expect(getAuthors()).toEqual([]);
    vi.restoreAllMocks();
  });
});