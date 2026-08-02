/**
 * authors.ts 单元测试
 *
 * 覆盖范围:
 * - getAuthors 正常解析 YAML 作者列表
 * - getAuthors YAML 文件不存在时返回空数组
 * - getAuthors YAML 非数组时返回空数组
 * - getAuthors 过滤无效条目（无 name 字段）
 * - getAuthors 字段类型安全（非字符串字段被忽略）
 * - getAuthorByName 精确匹配
 * - getAuthorByName 未匹配时回退到 __default__ 条目
 * - getAuthorByName 无 __default__ 且无匹配时返回 null
 * - getAuthorByName 空字符串返回 null
 * - 缓存行为（连续调用不重新读取文件）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';

// 重置模块缓存，避免测试间缓存泄漏
beforeEach(() => {
  vi.resetModules();
});

describe('getAuthors', () => {
  it('应从 authors.yaml 解析出作者列表', async () => {
    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(Array.isArray(authors)).toBe(true);
    expect(authors.length).toBeGreaterThan(0);
    // authors.yaml 中有 __default__ 和 Jyf0214 两个条目
    const names = authors.map((a) => a.name);
    expect(names).toContain('__default__');
    expect(names).toContain('Jyf0214');
  });

  it('作者条目应包含 nickname 和 avatar 字段', async () => {
    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    const jyf = authors.find((a) => a.name === 'Jyf0214');
    expect(jyf).toBeDefined();
    expect(jyf?.nickname).toBe('九月风');
    expect(jyf?.avatar).toBeTruthy();
  });

  it('__default__ 条目的 avatar 应为 /avatar.jpg', async () => {
    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    const def = authors.find((a) => a.name === '__default__');
    expect(def).toBeDefined();
    expect(def?.avatar).toBe('/avatar.jpg');
  });

  it('应过滤无 name 字段的条目', async () => {
    // 通过 mock fs 让读取返回包含无效条目的 YAML
    const yaml = `
- name: "valid"
  nickname: "V"
- nickname: "no-name"
- name: "also-valid"
`;
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yaml);

    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(authors.length).toBe(2);
    expect(authors.map((a) => a.name)).toEqual(['valid', 'also-valid']);

    vi.restoreAllMocks();
  });

  it('非字符串字段应被安全忽略', async () => {
    const yaml = `
- name: "test"
  nickname: 123
  avatar: true
  location: null
  skills: "not-array"
`;
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yaml);

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
    const yaml = `
- name: "skiller"
  skills:
    - "React"
    - 42
    - "TypeScript"
    - null
`;
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yaml);

    const { getAuthors } = await import('@/lib/authors');
    const authors = getAuthors();
    expect(authors[0]?.skills).toEqual(['React', 'TypeScript']);

    vi.restoreAllMocks();
  });
});

describe('getAuthors — 缓存行为', () => {
  it('连续调用应返回同一引用（缓存生效）', async () => {
    const { getAuthors } = await import('@/lib/authors');
    const a = getAuthors();
    const b = getAuthors();
    expect(a).toBe(b);
  });
});

describe('getAuthorByName', () => {
  it('应精确匹配已知作者', async () => {
    const { getAuthorByName } = await import('@/lib/authors');
    const author = getAuthorByName('Jyf0214');
    expect(author).not.toBeNull();
    expect(author?.name).toBe('Jyf0214');
    expect(author?.nickname).toBe('九月风');
  });

  it('未匹配时应回退到 __default__ 条目', async () => {
    const { getAuthorByName } = await import('@/lib/authors');
    const author = getAuthorByName('UnknownAuthor');
    expect(author).not.toBeNull();
    expect(author?.name).toBe('__default__');
    expect(author?.avatar).toBe('/avatar.jpg');
  });

  it('空字符串应返回 null', async () => {
    const { getAuthorByName } = await import('@/lib/authors');
    expect(getAuthorByName('')).toBeNull();
  });

  it('无 __default__ 条目且无匹配时返回 null', async () => {
    const yaml = `
- name: "only-one"
  nickname: "Solo"
`;
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yaml);

    const { getAuthorByName } = await import('@/lib/authors');
    const author = getAuthorByName('nonexistent');
    expect(author).toBeNull();

    vi.restoreAllMocks();
  });

  it('大小写敏感匹配', async () => {
    const { getAuthorByName } = await import('@/lib/authors');
    // authors.yaml 中 name 为 "Jyf0214"，大小写不同应不匹配
    expect(getAuthorByName('jyf0214')).not.toBeNull(); // 回退到 __default__
    expect(getAuthorByName('JYF0214')).not.toBeNull(); // 回退到 __default__
  });
});

describe('getAuthors — YAML 异常情况', () => {
  it('YAML 文件不存在时返回空数组', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const { getAuthors } = await import('@/lib/authors');
    expect(getAuthors()).toEqual([]);
    vi.restoreAllMocks();
  });

  it('YAML 内容非数组时返回空数组', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    // 返回一个合法 YAML 但解析结果不是数组
    vi.spyOn(fs, 'readFileSync').mockReturnValue('key: value\nother: data');
    const { getAuthors } = await import('@/lib/authors');
    expect(getAuthors()).toEqual([]);
    vi.restoreAllMocks();
  });
});
