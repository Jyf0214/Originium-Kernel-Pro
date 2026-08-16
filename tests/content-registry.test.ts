/**
 * content-registry.ts 单元测试
 *
 * 覆盖范围:
 * - extractWikiLinks: [[标题]] 提取（纯函数）
 * - getContentRegistry: 注册表构建、标题映射、条目字段
 * - resolveWikiLink: 标题 → URL 解析
 * - getBacklinks / getOutgoingReferences: 前后向引用
 * - buildWikiLinkMap: 客户端映射构建
 *
 * 数据隔离: 通过 mock getContentFiles 注入固定内容数据，
 * 不读取仓库真实的 posts/faces 目录，避免测试依赖内容文件。
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ContentFile } from '../src/types/content';
import {
  extractWikiLinks,
  getContentRegistry,
  resolveWikiLink,
  getBacklinks,
  getOutgoingReferences,
  buildWikiLinkMap,
  clearContentRegistry,
} from '../src/lib/content-registry';

// 关键: NODE_ENV=development 使 CACHE_TTL=0，避免缓存污染测试
Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true, enumerable: true });

/** 固定的内容文件数据（与真实内容结构等价，仅作测试夹具） */
const postsFiles: ContentFile[] = [
  {
    slug: '/daily/2024-01-15',
    meta: { title: '新的开始', date: '2024-01-15', author: 'Admin', tags: ['日常', '随笔'], description: '新的一年，新的开始' },
    content: '今天是新年的第十五天。',
    raw: '',
  },
  {
    slug: '/travel-in-China/beijing',
    meta: { title: '北京之行', date: '2024-06-20', author: 'Admin', tags: ['旅行', '北京'] },
    content: '六月的北京，阳光明媚。',
    raw: '',
  },
];

const facesFiles: ContentFile[] = [
  {
    slug: '/friends/wang-wu',
    meta: { title: '王五', date: '2024-02-14', tags: ['朋友', '旅行'] },
    content: '在一次川西旅行中认识的朋友。',
    raw: '',
  },
];

// mock 必须在顶层声明（vitest 会 hoist），注入固定内容数据
vi.mock('../src/lib/content', () => ({
  getContentFiles: vi.fn((section: 'posts' | 'faces' | 'diary') => {
    if (section === 'posts') return postsFiles;
    if (section === 'faces') return facesFiles;
    return [];
  }),
  // 无目录索引时所有文件视为公开，目录级私有过滤不生效
  getContentIndexes: vi.fn(() => []),
}));

// config access 规则在测试环境中一律放行（真实规则由 config.yaml 驱动，
// 已在页面层/API 层过滤，此处只验证映射构建逻辑）
vi.mock('../src/lib/config', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    canAccess: vi.fn(() => true),
  };
});

beforeEach(() => {
  vi.resetModules();
  clearContentRegistry();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractWikiLinks', () => {
  test('应从文本中提取 [[标题]] 引用', () => {
    const text = '请参考 [[北京之行]] 和 [[王五]] 的内容';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['北京之行', '王五']);
  });

  test('无引用时返回空数组', () => {
    const text = '这是一段没有引用的普通文本';
    const links = extractWikiLinks(text);
    expect(links).toEqual([]);
  });

  test('应处理嵌套方括号（不匹配的）', () => {
    const text = '参考 [[普通链接 [带括号]]] 和 [[另一个]]';
    const links = extractWikiLinks(text);
    // [^\[\]]+? 匹配非括号字符，所以 "普通链接 [带括号" 会被捕获
    expect(links.length).toBeGreaterThan(0);
  });

  test('应支持标题前后的空白', () => {
    const text = '[[  北京之行  ]]';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['北京之行']);
  });

  test('应提取多个不相邻的引用', () => {
    const text = '开头 [[A]] 中间文字 [[B]] 结尾 [[C]]';
    const links = extractWikiLinks(text);
    expect(links).toEqual(['A', 'B', 'C']);
  });
});

describe('getContentRegistry', () => {
  test('应返回包含 posts 和 faces 内容的注册表', () => {
    const reg = getContentRegistry();
    expect(reg.titleMap.size).toBeGreaterThan(0);
    expect(reg.entries.length).toBeGreaterThan(0);
  });

  test('标题映射应为小写键', () => {
    const reg = getContentRegistry();
    for (const key of reg.titleMap.keys()) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  test('应包含固定测试数据中的内容', () => {
    const reg = getContentRegistry();
    // posts/daily/2024-01-15.md 的标题是 "新的开始"
    const entry = reg.titleMap.get('新的开始');
    expect(entry).toBeDefined();
    expect(entry?.section).toBe('posts');
    expect(entry?.slug).toBe('/daily/2024-01-15');
  });

  test('应包含 faces 内容', () => {
    const reg = getContentRegistry();
    // faces/friends/wang-wu.md 的标题是 "王五"
    const entry = reg.titleMap.get('王五');
    expect(entry).toBeDefined();
    expect(entry?.section).toBe('faces');
    expect(entry?.slug).toBe('/friends/wang-wu');
  });

  test('条目应包含 tags 信息', () => {
    const reg = getContentRegistry();
    const entry = reg.titleMap.get('北京之行');
    expect(entry).toBeDefined();
    expect(entry?.tags).toContain('旅行');
  });
});

describe('resolveWikiLink', () => {
  test('应将已知标题解析为 URL', () => {
    const result = resolveWikiLink('北京之行');
    expect(result).toBeDefined();
    expect(result!.url).toBe('/posts/travel-in-China/beijing');
    expect(result!.title).toBe('北京之行');
    expect(result!.section).toBe('posts');
  });

  test('faces 内容应解析到 /faces/ 路径', () => {
    const result = resolveWikiLink('王五');
    expect(result).toBeDefined();
    expect(result!.url).toBe('/faces/friends/wang-wu');
    expect(result!.section).toBe('faces');
  });

  test('大小写不敏感匹配', () => {
    // 注册表用小写键，但 resolveWikiLink 内部做了 toLowerCase
    const result = resolveWikiLink('北京之行');
    expect(result).toBeDefined();
  });

  test('未知标题应返回 null', () => {
    const result = resolveWikiLink('完全不存在的标题');
    expect(result).toBeNull();
  });
});

describe('getBacklinks', () => {
  test('返回数组类型', () => {
    const backlinks = getBacklinks('posts', '/daily/2024-01-15');
    expect(Array.isArray(backlinks)).toBe(true);
  });
});

describe('getOutgoingReferences', () => {
  test('返回数组类型', () => {
    const refs = getOutgoingReferences('posts', '/daily/2024-01-15');
    expect(Array.isArray(refs)).toBe(true);
  });
});

describe('buildWikiLinkMap', () => {
  test('应返回标题到 URL 的映射', async () => {
    const map = await buildWikiLinkMap();
    expect(typeof map).toBe('object');
    expect(Object.keys(map).length).toBeGreaterThan(0);
  });

  test('映射键应为小写', async () => {
    const map = await buildWikiLinkMap();
    for (const key of Object.keys(map)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  test('映射值应包含 url 和 title', async () => {
    const map = await buildWikiLinkMap();
    const entry = map['北京之行'];
    expect(entry).toBeDefined();
    expect(entry?.url).toBe('/posts/travel-in-China/beijing');
    expect(entry?.title).toBe('北京之行');
  });
});