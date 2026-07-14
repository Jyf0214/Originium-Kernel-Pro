/* eslint-disable max-lines -- 内容模块测试覆盖全面，拆分会降低可读性 */
/**
 * lib/content.ts 单元测试
 *
 * 覆盖范围:
 * - getContentFiles: 缓存行为、文件扫描、日期排序、目录不存在
 * - getContentFilesAsync: 异步版本的并发读取
 * - getContentIndexes: 根目录/子目录索引扫描、.md/.tsx/.ts 索引文件
 * - filterPublicFiles: 公开/隐藏/目录级公开过滤
 * - getContentFile: 单文件获取、路径穿越防护
 * - getAllSlugs: slug 列表扫描
 * - getAdjacentPosts: 前后篇文章导航
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'

// 测试文件中 mock 类型大量使用 any 是合理的，全局禁用该规则
/* eslint-disable @typescript-eslint/no-explicit-any */

// 关键: NODE_ENV=development 使 CACHE_TTL=0，避免缓存污染测试
Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true, enumerable: true })

// ── fs mock ──
const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
  readFileSync: vi.fn().mockReturnValue(''),
}))

vi.mock('fs', () => ({
  default: fsMock,
  existsSync: fsMock.existsSync,
  readdirSync: fsMock.readdirSync,
  readFileSync: fsMock.readFileSync,
}))

// ── gray-matter mock ──
const matterMock = vi.hoisted(() => ({
  default: vi.fn((raw: string) => ({ data: {}, content: raw })),
}))

vi.mock('gray-matter', () => matterMock)

function makeDirent(name: string, isDirectory: boolean) {
  return { name, isDirectory: () => isDirectory, isFile: () => !isDirectory }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(process, 'cwd').mockReturnValue('/project')
  fsMock.existsSync.mockReset().mockReturnValue(false)
  fsMock.readdirSync.mockReset().mockReturnValue([])
  fsMock.readFileSync.mockReset().mockReturnValue('')
  matterMock.default.mockReset().mockImplementation((raw: string) => ({ data: {}, content: raw }))
})

// ═══════════════════════════════════════════
// getContentFiles
// ═══════════════════════════════════════════
describe('getContentFiles', () => {
  test('目录不存在时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(false)
    const { getContentFiles } = await import('@/lib/content')
    expect(getContentFiles('posts')).toEqual([])
  })

  test('无 .md 文件时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([makeDirent('readme.txt', false)])
    const { getContentFiles } = await import('@/lib/content')
    expect(getContentFiles('posts')).toEqual([])
  })

  test('解析单个 .md 文件', async () => {
    fsMock.existsSync.mockReturnValue(true)
    const mdContent = '---\ntitle: 测试文章\ndate: 2024-01-15\n---\n正文内容'
    matterMock.default.mockReturnValue({
      data: { title: '测试文章', date: '2024-01-15' }, content: '正文内容',
    })
    fsMock.readdirSync.mockReturnValue([makeDirent('hello.md', false)])
    fsMock.readFileSync.mockReturnValue(mdContent)

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')

    expect(files).toHaveLength(1)
    expect(files[0]!.slug).toBe('/hello')
    expect(files[0]!.meta.title).toBe('测试文章')
    expect(files[0]!.meta.date).toBe('2024-01-15')
    expect(files[0]!.content).toBe('正文内容')
    expect(files[0]!.raw).toBe(mdContent)
  })

  test('frontmatter 缺少 title 时用文件名作为默认值', async () => {
    fsMock.existsSync.mockReturnValue(true)
    matterMock.default.mockReturnValue({ data: {}, content: '内容' })
    fsMock.readdirSync.mockReturnValue([makeDirent('untitled.md', false)])
    fsMock.readFileSync.mockReturnValue('---\n---\n内容')

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files[0]!.meta.title).toBe('untitled')
  })

  test('frontmatter 缺少 date 时 date 为 undefined', async () => {
    fsMock.existsSync.mockReturnValue(true)
    matterMock.default.mockReturnValue({ data: { title: '无日期' }, content: '' })
    fsMock.readdirSync.mockReturnValue([makeDirent('nodate.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: 无日期\n---')

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files[0]!.meta.date).toBeUndefined()
  })

  test('按日期降序排序', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('old.md', false), makeDirent('new.md', false),
    ])
    fsMock.readFileSync
      .mockReturnValueOnce('---\ndate: 2024-01-01\n---\n')
      .mockReturnValueOnce('---\ndate: 2024-06-15\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { date: '2024-01-01' }, content: '' })
      .mockReturnValueOnce({ data: { date: '2024-06-15' }, content: '' })

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files).toHaveLength(2)
    expect(files[0]!.slug).toBe('/new')
    expect(files[1]!.slug).toBe('/old')
  })

  test('无日期文件排在最后', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('dated.md', false), makeDirent('undated.md', false),
    ])
    fsMock.readFileSync
      .mockReturnValueOnce('---\ndate: 2024-03-01\n---\n')
      .mockReturnValueOnce('---\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { date: '2024-03-01' }, content: '' })
      .mockReturnValueOnce({ data: {}, content: '' })

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files[0]!.slug).toBe('/dated')
    expect(files[1]!.slug).toBe('/undated')
  })

  test('递归扫描子目录中的 .md 文件', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('sub', true), makeDirent('root.md', false)])
      .mockReturnValueOnce([makeDirent('child.md', false)])
    fsMock.readFileSync
      .mockReturnValueOnce('---\ntitle: root\n---\n')
      .mockReturnValueOnce('---\ntitle: child\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { title: 'root' }, content: '' })
      .mockReturnValueOnce({ data: { title: 'child' }, content: '' })

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files).toHaveLength(2)
    const slugs = files.map((f) => f.slug).sort()
    expect(slugs).toContain('/root')
    expect(slugs).toContain('/sub/child')
  })

  test('非 .md 文件被忽略', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('image.png', false), makeDirent('style.css', false), makeDirent('valid.md', false),
    ])
    fsMock.readFileSync.mockReturnValue('---\ntitle: ok\n---\n')
    matterMock.default.mockReturnValue({ data: { title: 'ok' }, content: '' })

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files).toHaveLength(1)
    expect(files[0]!.slug).toBe('/valid')
  })

  test('faces 和 diary section 使用各自目录', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([makeDirent('f.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: f\n---\n')
    matterMock.default.mockReturnValue({ data: { title: 'f' }, content: '' })

    const { getContentFiles } = await import('@/lib/content')
    getContentFiles('faces')
    const facesDir = fsMock.readdirSync.mock.calls[0]![0] as string
    expect(facesDir).toContain('faces')

    // 重置 mock 后测试 diary
    fsMock.readdirSync.mockReset().mockReturnValue([makeDirent('d.md', false)])
    fsMock.readFileSync.mockReset().mockReturnValue('---\ntitle: d\n---\n')
    matterMock.default.mockReset().mockReturnValue({ data: { title: 'd' }, content: '' })

    getContentFiles('diary')
    const diaryDir = fsMock.readdirSync.mock.calls[0]![0] as string
    expect(diaryDir).toContain('diary')
  })

  test('frontmatter 包含 lang 和 translations 字段', async () => {
    fsMock.existsSync.mockReturnValue(true)
    matterMock.default.mockReturnValue({
      data: { title: '多语言', lang: 'en', translations: { 'zh-CN': '/cn-post' } }, content: '',
    })
    fsMock.readdirSync.mockReturnValue([makeDirent('multi.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: 多语言\nlang: en\n---')

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files[0]!.meta.lang).toBe('en')
    expect(files[0]!.meta.translations).toEqual({ 'zh-CN': '/cn-post' })
  })

  test('lang 字段不是字符串时默认为 zh-CN', async () => {
    fsMock.existsSync.mockReturnValue(true)
    matterMock.default.mockReturnValue({ data: { title: '默认语言', lang: 123 }, content: '' })
    fsMock.readdirSync.mockReturnValue([makeDirent('bad-lang.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: 默认语言\n---')

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files[0]!.meta.lang).toBe('zh-CN')
  })

  test('translations 不是对象时为 undefined', async () => {
    fsMock.existsSync.mockReturnValue(true)
    matterMock.default.mockReturnValue({ data: { title: '坏翻译', translations: 'bad' }, content: '' })
    fsMock.readdirSync.mockReturnValue([makeDirent('bad-trans.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: 坏翻译\n---')

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect(files[0]!.meta.translations).toBeUndefined()
  })

  test('frontmatter 中的额外字段被保留', async () => {
    fsMock.existsSync.mockReturnValue(true)
    matterMock.default.mockReturnValue({ data: { title: '扩展', customField: 'hello' }, content: '' })
    fsMock.readdirSync.mockReturnValue([makeDirent('ext.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: 扩展\n---')

    const { getContentFiles } = await import('@/lib/content')
    const files = getContentFiles('posts')
    expect((files[0]!.meta as any).customField).toBe('hello')
  })
})

// ═══════════════════════════════════════════
// getContentFiles 缓存
// ═══════════════════════════════════════════
describe('getContentFiles 缓存', () => {
  test('development 模式下不缓存，每次重新扫描', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true, enumerable: true })
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([makeDirent('a.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: v1\n---\n')
    matterMock.default.mockReturnValue({ data: { title: 'v1' }, content: '' })

    const { getContentFiles } = await import('@/lib/content')
    const first = getContentFiles('posts')
    expect(first).toHaveLength(1)

    // 改变返回值
    fsMock.readdirSync.mockReset().mockReturnValue([makeDirent('a.md', false), makeDirent('b.md', false)])
    fsMock.readFileSync.mockReset().mockReturnValue('---\ntitle: v2\n---\n')
    matterMock.default.mockReset().mockReturnValue({ data: { title: 'v2' }, content: '' })

    const second = getContentFiles('posts')
    expect(second).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════
// getContentFilesAsync
// ═══════════════════════════════════════════
describe('getContentFilesAsync', () => {
  test('目录不存在时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(false)
    const { getContentFilesAsync } = await import('@/lib/content')
    expect(await getContentFilesAsync('posts')).toEqual([])
  })

  test('无 .md 文件时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    const { getContentFilesAsync } = await import('@/lib/content')
    expect(await getContentFilesAsync('posts')).toEqual([])
  })

  test('异步读取并按日期降序排序', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('a.md', false), makeDirent('b.md', false),
    ])
    fsMock.readFileSync
      .mockReturnValueOnce('---\ndate: 2024-01-01\n---\n')
      .mockReturnValueOnce('---\ndate: 2024-12-25\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { date: '2024-01-01' }, content: '' })
      .mockReturnValueOnce({ data: { date: '2024-12-25' }, content: '' })

    const { getContentFilesAsync } = await import('@/lib/content')
    const files = await getContentFilesAsync('posts')
    expect(files).toHaveLength(2)
    const dates = files.map((f) => f.meta.date)
    expect(dates[0]).toBe('2024-12-25')
    expect(dates[1]).toBe('2024-01-01')
  })

  test('文件不存在时返回 null 并被过滤', async () => {
    // scanMarkdownFiles 需要 existsSync=true 才能发现文件
    // withConcurrency 回调中 existsSync 决定是否读取
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('exists.md', false), makeDirent('missing.md', false),
    ])
    // scanMarkdownFiles 中: 根目录 existsSync + readdirSync
    // withConcurrency 回调中对每个 slug 的 filePath: existsSync
    let existsCount = 0
    fsMock.existsSync.mockImplementation(() => {
      existsCount++
      // 前 2 次 (scanMarkdownFiles 的根目录+子目录) 返回 true
      // 第 3 次 (exists.md filePath) 返回 true
      // 第 4 次 (missing.md filePath) 返回 false
      return existsCount <= 3
    })
    fsMock.readFileSync.mockReturnValue('---\ntitle: ok\n---\n')
    matterMock.default.mockReturnValue({ data: { title: 'ok' }, content: '' })

    const { getContentFilesAsync } = await import('@/lib/content')
    const files = await getContentFilesAsync('posts')
    expect(files).toHaveLength(1)
    expect(files[0]!.slug).toBe('/exists')
  })
})

// ═══════════════════════════════════════════
// getContentIndexes
// ═══════════════════════════════════════════
describe('getContentIndexes', () => {
  test('目录不存在时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(false)
    const { getContentIndexes } = await import('@/lib/content')
    expect(getContentIndexes('posts')).toEqual([])
  })

  test('读取根目录 index.md', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    matterMock.default.mockReturnValue({
      data: { title: '根目录', description: '描述', public: true, groupName: '默认分组' },
      content: '正文',
    })
    fsMock.readFileSync.mockReturnValue('---\ntitle: 根目录\n---\n')

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes).toHaveLength(1)
    expect(indexes[0]!.slug).toBe('/')
    expect(indexes[0]!.title).toBe('根目录')
    expect(indexes[0]!.description).toBe('描述')
    expect(indexes[0]!.public).toBe(true)
    expect(indexes[0]!.groupName).toBe('默认分组')
  })

  test('index.md 的 public 为 false 时正确标记', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    matterMock.default.mockReturnValue({ data: { title: '私有', public: false }, content: '' })
    fsMock.readFileSync.mockReturnValue('---\ntitle: 私有\n---\n')

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes[0]!.public).toBe(false)
  })

  test('index.md 缺少 public 字段时默认为 true', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    matterMock.default.mockReturnValue({ data: { title: '默认公开' }, content: '' })
    fsMock.readFileSync.mockReturnValue('---\ntitle: 默认公开\n---\n')

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes[0]!.public).toBe(true)
  })

  test('子目录中的 index.md 也被扫描', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('subdir', true)])
      .mockReturnValueOnce([])
    matterMock.default
      .mockReturnValueOnce({ data: { title: '根' }, content: '' })
      .mockReturnValueOnce({ data: { title: '子目录' }, content: '' })
    fsMock.readFileSync
      .mockReturnValueOnce('---\ntitle: 根\n---\n')
      .mockReturnValueOnce('---\ntitle: 子目录\n---\n')

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes.length).toBeGreaterThanOrEqual(2)
    const titles = indexes.map((i) => i.title)
    expect(titles).toContain('根')
    expect(titles).toContain('子目录')
  })

  test('读取 index.tsx 文件中的配置', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    fsMock.existsSync
      .mockReturnValueOnce(true)  // 根目录
      .mockReturnValueOnce(false) // index.md 不存在
      .mockReturnValueOnce(true)  // index.tsx 存在
    fsMock.readFileSync.mockReturnValue(`
      export const config = {
        title: "TSX 标题",
        public: true,
        groupName: "TSX 分组",
        description: "TSX 描述"
      }
    `)

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes).toHaveLength(1)
    expect(indexes[0]!.title).toBe('TSX 标题')
    expect(indexes[0]!.public).toBe(true)
    expect(indexes[0]!.groupName).toBe('TSX 分组')
    expect(indexes[0]!.description).toBe('TSX 描述')
  })

  test('读取 index.ts 文件中的配置', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    fsMock.existsSync
      .mockReturnValueOnce(true)  // 根目录
      .mockReturnValueOnce(false) // index.md
      .mockReturnValueOnce(false) // index.tsx
      .mockReturnValueOnce(true)  // index.ts
    fsMock.readFileSync.mockReturnValue("export default { title: 'TS 标题', public: false }")

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes).toHaveLength(1)
    expect(indexes[0]!.title).toBe('TS 标题')
    expect(indexes[0]!.public).toBe(false)
  })

  test('index.ts 缺少 public 字段时默认为 true', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    fsMock.existsSync
      .mockReturnValueOnce(true)  // 根目录
      .mockReturnValueOnce(false) // index.md
      .mockReturnValueOnce(false) // index.tsx
      .mockReturnValueOnce(true)  // index.ts
    fsMock.readFileSync.mockReturnValue("export const config = { title: '无 public' }")

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes[0]!.public).toBe(true)
  })

  test('无索引文件时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    fsMock.existsSync
      .mockReturnValueOnce(true)  // 根目录
      .mockReturnValueOnce(false) // index.md
      .mockReturnValueOnce(false) // index.tsx
      .mockReturnValueOnce(false) // index.ts

    const { getContentIndexes } = await import('@/lib/content')
    const indexes = getContentIndexes('posts')
    expect(indexes).toEqual([])
  })
})

// ═══════════════════════════════════════════
// filterPublicFiles
// ═══════════════════════════════════════════
describe('filterPublicFiles', () => {
  test('目录级 public=true 时保留所有文章', async () => {
    const { filterPublicFiles } = await import('@/lib/content')
    const files = [
      { slug: '/post1', meta: { title: 'a' }, content: '', raw: '' },
      { slug: '/post2', meta: { title: 'b' }, content: '', raw: '' },
    ] as any[]
    const indexes = [{ slug: '/', title: '根', public: true, children: [] }] as any[]
    expect(filterPublicFiles(files, indexes)).toHaveLength(2)
  })

  test('目录级 public=false 时过滤掉该目录下所有文章', async () => {
    const { filterPublicFiles } = await import('@/lib/content')
    const files = [
      { slug: '/secret/post1', meta: { title: 'a' }, content: '', raw: '' },
      { slug: '/secret/post2', meta: { title: 'b' }, content: '', raw: '' },
    ] as any[]
    const indexes = [{ slug: '/secret', title: '私密', public: false, children: [] }] as any[]
    expect(filterPublicFiles(files, indexes)).toHaveLength(0)
  })

  test('hidden=true 的文章被过滤', async () => {
    const { filterPublicFiles } = await import('@/lib/content')
    const files = [
      { slug: '/visible', meta: { title: '可见' }, content: '', raw: '' },
      { slug: '/hidden', meta: { title: '隐藏', hidden: true }, content: '', raw: '' },
    ] as any[]
    const indexes = [{ slug: '/', title: '根', public: true, children: [] }] as any[]
    const result = filterPublicFiles(files, indexes)
    expect(result).toHaveLength(1)
    expect(result[0]!.slug).toBe('/visible')
  })

  test('目录索引不匹配时默认 public=true', async () => {
    const { filterPublicFiles } = await import('@/lib/content')
    const files = [
      { slug: '/unknown-dir/post', meta: { title: 'a' }, content: '', raw: '' },
    ] as any[]
    const indexes = [{ slug: '/other', title: '其他', public: false, children: [] }] as any[]
    expect(filterPublicFiles(files, indexes)).toHaveLength(1)
  })

  test('混合场景: 有的公开有的私密', async () => {
    const { filterPublicFiles } = await import('@/lib/content')
    const files = [
      { slug: '/pub/post1', meta: { title: '公开1' }, content: '', raw: '' },
      { slug: '/pub/post2', meta: { title: '公开2', hidden: true }, content: '', raw: '' },
      { slug: '/priv/post3', meta: { title: '私密1' }, content: '', raw: '' },
      { slug: '/root-post', meta: { title: '根文章' }, content: '', raw: '' },
    ] as any[]
    const indexes = [
      { slug: '/', title: '根', public: true, children: [] },
      { slug: '/pub', title: '公开目录', public: true, children: [] },
      { slug: '/priv', title: '私密目录', public: false, children: [] },
    ] as any[]
    const result = filterPublicFiles(files, indexes)
    expect(result).toHaveLength(2)
    const slugs = result.map((f) => f.slug).sort()
    expect(slugs).toEqual(['/pub/post1', '/root-post'])
  })
})

// ═══════════════════════════════════════════
// getContentFile
// ═══════════════════════════════════════════
describe('getContentFile', () => {
  test('文件不存在时返回 null', async () => {
    fsMock.existsSync.mockReturnValue(false)
    const { getContentFile } = await import('@/lib/content')
    expect(getContentFile('posts', '/missing')).toBeNull()
  })

  test('文件存在时返回解析后的内容', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readFileSync.mockReturnValue('---\ntitle: 单文件\n---\n内容')
    matterMock.default.mockReturnValue({ data: { title: '单文件' }, content: '内容' })

    const { getContentFile } = await import('@/lib/content')
    const file = getContentFile('posts', '/single')
    expect(file).not.toBeNull()
    expect(file!.slug).toBe('/single')
    expect(file!.meta.title).toBe('单文件')
  })

  test('路径穿越防护: ../ 不允许', async () => {
    fsMock.existsSync.mockReturnValue(true)
    const { getContentFile } = await import('@/lib/content')
    expect(getContentFile('posts', '/../../../etc/passwd')).toBeNull()
  })
})

// ═══════════════════════════════════════════
// getAllSlugs
// ═══════════════════════════════════════════
describe('getAllSlugs', () => {
  test('目录不存在时返回空数组', async () => {
    fsMock.existsSync.mockReturnValue(false)
    const { getAllSlugs } = await import('@/lib/content')
    expect(getAllSlugs('posts')).toEqual([])
  })

  test('返回所有 .md 文件的 slug', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('a.md', false), makeDirent('b.md', false),
    ])
    const { getAllSlugs } = await import('@/lib/content')
    const slugs = getAllSlugs('posts')
    expect(slugs).toHaveLength(2)
    expect(slugs).toContain('/a')
    expect(slugs).toContain('/b')
  })

  test('包含子目录的 slug', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('sub', true)])
      .mockReturnValueOnce([makeDirent('nested.md', false)])
    const { getAllSlugs } = await import('@/lib/content')
    const slugs = getAllSlugs('posts')
    expect(slugs).toContain('/sub/nested')
  })
})

// ═══════════════════════════════════════════
// getAdjacentPosts
// ═══════════════════════════════════════════
describe('getAdjacentPosts', () => {
  test('找不到当前文章时返回 null/null', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([])
    const { getAdjacentPosts } = await import('@/lib/content')
    expect(getAdjacentPosts('/nonexistent')).toEqual({ prev: null, next: null })
  })

  test('只有一篇文章时 prev 和 next 都是 null', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([makeDirent('only.md', false)])
    fsMock.readFileSync.mockReturnValue('---\ntitle: 唯一\ndate: 2024-01-01\n---\n')
    matterMock.default.mockReturnValue({ data: { title: '唯一', date: '2024-01-01' }, content: '' })

    const { getAdjacentPosts } = await import('@/lib/content')
    expect(getAdjacentPosts('/only')).toEqual({ prev: null, next: null })
  })

  test('三篇文章: 中间那篇有前后', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('old.md', false), makeDirent('mid.md', false), makeDirent('new.md', false),
    ])
    fsMock.readFileSync
      .mockReturnValueOnce('---\ntitle: 旧\ndate: 2024-01-01\n---\n')
      .mockReturnValueOnce('---\ntitle: 中\ndate: 2024-06-01\n---\n')
      .mockReturnValueOnce('---\ntitle: 新\ndate: 2024-12-01\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { title: '旧', date: '2024-01-01' }, content: '' })
      .mockReturnValueOnce({ data: { title: '中', date: '2024-06-01' }, content: '' })
      .mockReturnValueOnce({ data: { title: '新', date: '2024-12-01' }, content: '' })

    const { getAdjacentPosts } = await import('@/lib/content')
    // 排序后: new(0), mid(1), old(2)
    const result = getAdjacentPosts('/mid')
    expect(result.prev!.slug).toBe('/old')
    expect(result.prev!.title).toBe('旧')
    expect(result.next!.slug).toBe('/new')
    expect(result.next!.title).toBe('新')
  })

  test('第一篇(最新)没有 next', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('a.md', false), makeDirent('b.md', false),
    ])
    fsMock.readFileSync
      .mockReturnValue('---\ntitle: A\ndate: 2024-01-01\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { title: 'A', date: '2024-01-01' }, content: '' })
      .mockReturnValueOnce({ data: { title: 'B', date: '2024-06-01' }, content: '' })

    const { getAdjacentPosts } = await import('@/lib/content')
    // 排序后: B(0), A(1) → B 是最新
    const newest = getAdjacentPosts('/b')
    expect(newest.prev!.slug).toBe('/a')
    expect(newest.next).toBeNull()
  })

  test('最后一篇没有 prev', async () => {
    fsMock.existsSync.mockReturnValue(true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('a.md', false), makeDirent('b.md', false),
    ])
    fsMock.readFileSync
      .mockReturnValue('---\ntitle: A\ndate: 2024-01-01\n---\n')
    matterMock.default
      .mockReturnValueOnce({ data: { title: 'A', date: '2024-01-01' }, content: '' })
      .mockReturnValueOnce({ data: { title: 'B', date: '2024-06-01' }, content: '' })

    const { getAdjacentPosts } = await import('@/lib/content')
    // 排序后: B(0), A(1) → A 是最旧
    const oldest = getAdjacentPosts('/a')
    expect(oldest.prev).toBeNull()
    expect(oldest.next!.slug).toBe('/b')
  })
})
