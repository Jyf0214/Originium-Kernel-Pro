/**
 * lib/page-source/fs.ts 单元测试
 *
 * 覆盖范围:
 * - fetchPageHtml: 文件存在/不存在/readFileSync 异常/normalizeWebDavContent 结果为空
 * - fetchPageMeta: buildMetaPath 返回 null/文件存在/JSON.parse 失败/validatePageMeta 失败
 * - scanLocalPagesHtml: 空目录/HTML 文件扫描/深度限制 2 层/非 HTML 文件忽略
 * - deepScanLocalFiles: 递归扫描/深度限制 3 层/目录不存在/读取异常
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// ── fs mock ──
const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn().mockImplementation(() => false),
  readdirSync: vi.fn().mockReturnValue([]),
  readFileSync: vi.fn().mockReturnValue(''),
}))

vi.mock('fs', () => ({
  default: fsMock,
  existsSync: fsMock.existsSync,
  readdirSync: fsMock.readdirSync,
  readFileSync: fsMock.readFileSync,
}))

// ── shared 模块 mock ──
const sharedMock = vi.hoisted(() => ({
  normalizeWebDavContent: vi.fn((raw: string | Buffer | { data: unknown }) => {
    if (typeof raw === 'string') return raw
    if (Buffer.isBuffer(raw)) return raw.toString('utf-8')
    if (raw?.data) return String(raw.data)
    return String(raw)
  }),
  buildMetaPath: vi.fn((relativePath: string) => {
    const parts = relativePath.split('/')
    if (parts.length < 2) return null
    const filename = parts[parts.length - 1]
    if (!filename) return null
    const dir = parts.slice(0, -1).join('/')
    const name = filename.replace(/\.html?$/i, '')
    if (!name) return null
    return `${dir}/${name}/meta.json`
  }),
  validatePageMeta: vi.fn((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return false
    return true
  }),
}))

vi.mock('@/lib/page-source/shared', () => sharedMock)

function makeDirent(name: string, isDirectory: boolean) {
  return { name, isDirectory: () => isDirectory, isFile: () => !isDirectory }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(process, 'cwd').mockReturnValue('/project')
  fsMock.existsSync.mockReset().mockImplementation(() => false)
  fsMock.readdirSync.mockReset().mockReturnValue([])
  fsMock.readFileSync.mockReset().mockReturnValue('')
  sharedMock.normalizeWebDavContent.mockReset().mockImplementation((raw: string | Buffer | { data: unknown }) => {
    if (typeof raw === 'string') return raw
    if (Buffer.isBuffer(raw)) return raw.toString('utf-8')
    if (raw?.data) return String(raw.data)
    return String(raw)
  })
  sharedMock.buildMetaPath.mockReset().mockImplementation((relativePath: string) => {
    const parts = relativePath.split('/')
    if (parts.length < 2) return null
    const filename = parts[parts.length - 1]
    if (!filename) return null
    const dir = parts.slice(0, -1).join('/')
    const name = filename.replace(/\.html?$/i, '')
    if (!name) return null
    return `${dir}/${name}/meta.json`
  })
  sharedMock.validatePageMeta.mockReset().mockImplementation(() => true)
})

// ═══════════════════════════════════════════
// fetchPageHtml
// ═══════════════════════════════════════════
describe('fetchPageHtml', () => {
  test('文件不存在时返回 null', async () => {
    fsMock.existsSync.mockImplementation(() => false)
    const { fetchPageHtml } = await import('@/lib/page-source/fs')
    expect(fetchPageHtml('page/about.html')).toBeNull()
  })

  test('文件存在时返回读取并 normalize 的内容', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockReturnValue('<h1>Hello</h1>')

    const { fetchPageHtml } = await import('@/lib/page-source/fs')
    const result = fetchPageHtml('page/about.html')

    expect(result).toBe('<h1>Hello</h1>')
    expect(fsMock.readFileSync).toHaveBeenCalledWith(
      path.join('/project', 'public', 'page/about.html'),
      'utf-8',
    )
  })

  test('readFileSync 抛出异常时返回 null 并输出错误', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockImplementation(() => { throw new Error('权限不足') })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* noop */ })

    const { fetchPageHtml } = await import('@/lib/page-source/fs')
    const result = fetchPageHtml('page/secret.html')

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('fetchPageHtml 失败'),
      expect.any(Error),
    )
    consoleSpy.mockRestore()
  })

  test('normalizeWebDavContent 返回空字符串时返回 null', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockReturnValue('content')
    sharedMock.normalizeWebDavContent.mockReturnValue('')

    const { fetchPageHtml } = await import('@/lib/page-source/fs')
    expect(fetchPageHtml('page/empty.html')).toBeNull()
  })

  test('normalizeWebDavContent 处理 Buffer 输入', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    const buf = Buffer.from('<h1>Buffer</h1>')
    fsMock.readFileSync.mockReturnValue(buf)
    sharedMock.normalizeWebDavContent.mockReturnValue('<h1>Buffer</h1>')

    const { fetchPageHtml } = await import('@/lib/page-source/fs')
    const result = fetchPageHtml('page/buf.html')

    expect(result).toBe('<h1>Buffer</h1>')
    expect(sharedMock.normalizeWebDavContent).toHaveBeenCalledWith(buf)
  })

  test('使用 process.cwd() 拼接绝对路径', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/custom/root')
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockReturnValue('<p>test</p>')

    const { fetchPageHtml } = await import('@/lib/page-source/fs')
    fetchPageHtml('page/test.html')

    expect(fsMock.readFileSync).toHaveBeenCalledWith(
      path.join('/custom/root', 'public', 'page/test.html'),
      'utf-8',
    )
  })
})

// ═══════════════════════════════════════════
// fetchPageMeta
// ═══════════════════════════════════════════
describe('fetchPageMeta', () => {
  test('buildMetaPath 返回 null 时返回 null', async () => {
    sharedMock.buildMetaPath.mockReturnValue(null)
    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    expect(fetchPageMeta('invalid')).toBeNull()
    expect(fsMock.existsSync).not.toHaveBeenCalled()
  })

  test('meta 文件不存在时返回 null', async () => {
    sharedMock.buildMetaPath.mockReturnValue('page/about/meta.json')
    fsMock.existsSync.mockImplementation(() => false)

    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    expect(fetchPageMeta('page/about.html')).toBeNull()
  })

  test('成功读取并返回验证后的 meta', async () => {
    sharedMock.buildMetaPath.mockReturnValue('page/about/meta.json')
    fsMock.existsSync.mockImplementation(() => true)
    const metaData = { title: '关于', description: '关于页面' }
    fsMock.readFileSync.mockReturnValue(JSON.stringify(metaData))
    sharedMock.validatePageMeta.mockImplementation(() => true)

    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    const result = fetchPageMeta('page/about.html')

    expect(result).toEqual(metaData)
    expect(fsMock.readFileSync).toHaveBeenCalledWith(
      path.join('/project', 'public', 'page/about/meta.json'),
      'utf-8',
    )
  })

  test('JSON.parse 失败时返回 null', async () => {
    sharedMock.buildMetaPath.mockReturnValue('page/bad/meta.json')
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockReturnValue('这不是有效 JSON{{{')

    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    expect(fetchPageMeta('page/bad.html')).toBeNull()
  })

  test('validatePageMeta 返回 false 时返回 null', async () => {
    sharedMock.buildMetaPath.mockReturnValue('page/invalid/meta.json')
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockReturnValue('{"title": "test"}')
    sharedMock.validatePageMeta.mockImplementation(() => false)

    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    expect(fetchPageMeta('page/invalid.html')).toBeNull()
  })

  test('readFileSync 抛出异常时返回 null', async () => {
    sharedMock.buildMetaPath.mockReturnValue('page/err/meta.json')
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockImplementation(() => { throw new Error('读取失败') })

    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    expect(fetchPageMeta('page/err.html')).toBeNull()
  })

  test('validatePageMeta 接收原始 JSON 对象', async () => {
    sharedMock.buildMetaPath.mockReturnValue('page/validate/meta.json')
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readFileSync.mockReturnValue('{"tags":["a","b"],"creator":"admin"}')
    sharedMock.validatePageMeta.mockImplementation(() => true)

    const { fetchPageMeta } = await import('@/lib/page-source/fs')
    fetchPageMeta('page/validate.html')

    expect(sharedMock.validatePageMeta).toHaveBeenCalledWith({
      tags: ['a', 'b'],
      creator: 'admin',
    })
  })
})

// ═══════════════════════════════════════════
// scanLocalPagesHtml
// ═══════════════════════════════════════════
describe('scanLocalPagesHtml', () => {
  test('pages 目录不存在时返回空数组', async () => {
    fsMock.existsSync.mockImplementation(() => false)
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    expect(scanLocalPagesHtml()).toEqual([])
  })

  test('空目录返回空数组', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([])
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    expect(scanLocalPagesHtml()).toEqual([])
  })

  test('扫描 HTML 文件', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('about.html', false),
      makeDirent('index.html', false),
      makeDirent('readme.txt', false),
    ])
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    const result = scanLocalPagesHtml()
    expect(result).toHaveLength(2)
    const paths = result.map((r) => r.relativePath).sort()
    expect(paths).toContain(path.join('page', 'about.html'))
    expect(paths).toContain(path.join('page', 'index.html'))
  })

  test('扫描 .htm 扩展名', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([makeDirent('legacy.htm', false)])
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    const result = scanLocalPagesHtml()
    expect(result).toHaveLength(1)
    expect(result[0]!.relativePath).toBe(path.join('page', 'legacy.htm'))
  })

  test('递归扫描子目录', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('blog', true), makeDirent('root.html', false)])
      .mockReturnValueOnce([makeDirent('post.html', false)])
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    const result = scanLocalPagesHtml()
    expect(result).toHaveLength(2)
    const paths = result.map((r) => r.relativePath).sort()
    expect(paths).toContain(path.join('page', 'root.html'))
    expect(paths).toContain(path.join('page', 'blog', 'post.html'))
  })

  test('深度限制: 超过 2 层不扫描', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    // depth=1 有 sub1, depth=2 有 sub2, depth=3 应该被跳过
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('sub1', true)])
      .mockReturnValueOnce([makeDirent('sub2', true)])
    // 不应有第三次 readdirSync 调用

    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    const result = scanLocalPagesHtml()
    expect(result).toHaveLength(0)
    expect(fsMock.readdirSync).toHaveBeenCalledTimes(2)
  })

  test('非 HTML 文件被忽略', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('image.png', false),
      makeDirent('style.css', false),
      makeDirent('script.js', false),
      makeDirent('valid.html', false),
    ])
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    const result = scanLocalPagesHtml()
    expect(result).toHaveLength(1)
    expect(result[0]!.relativePath).toBe(path.join('page', 'valid.html'))
  })

  test('混合文件和子目录', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('top.html', false), makeDirent('docs', true), makeDirent('image.jpg', false)])
      .mockReturnValueOnce([makeDirent('guide.html', false), makeDirent('readme.md', false)])
    const { scanLocalPagesHtml } = await import('@/lib/page-source/fs')
    const result = scanLocalPagesHtml()
    expect(result).toHaveLength(2)
    const paths = result.map((r) => r.relativePath).sort()
    expect(paths).toContain(path.join('page', 'top.html'))
    expect(paths).toContain(path.join('page', 'docs', 'guide.html'))
  })
})

// ═══════════════════════════════════════════
// deepScanLocalFiles
// ═══════════════════════════════════════════
describe('deepScanLocalFiles', () => {
  test('目录不存在时返回空数组', async () => {
    fsMock.existsSync.mockImplementation(() => false)
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    expect(deepScanLocalFiles('page', 1)).toEqual([])
  })

  test('空目录返回空数组', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([])
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    expect(deepScanLocalFiles('page', 1)).toEqual([])
  })

  test('深度超过 3 时停止扫描', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    expect(deepScanLocalFiles('page', 4)).toEqual([])
    expect(fsMock.existsSync).not.toHaveBeenCalled()
  })

  test('扫描单层文件', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([makeDirent('file.html', false)])
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    const result = deepScanLocalFiles('page', 1)
    expect(result).toHaveLength(1)
    expect(result[0]!.relativePath).toBe('page/file.html')
  })

  test('空子目录递归不产生条目', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    // 第一层: 一个空子目录
    fsMock.readdirSync.mockReturnValue([makeDirent('empty', true)])
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    const result = deepScanLocalFiles('page', 1)
    // empty 是目录，不直接加入结果；其递归结果为空
    expect(result).toHaveLength(0)
  })

  test('递归深度扫描含文件', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('sub1', true)])
      .mockReturnValueOnce([makeDirent('sub2', true)])
      .mockReturnValueOnce([makeDirent('deep.txt', false)])

    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    const result = deepScanLocalFiles('page', 1)

    // 结果: sub1(目录,不直接加), sub1/sub2(目录,不直接加), sub1/sub2/deep.txt(文件)
    expect(result).toHaveLength(1)
    expect(result[0]!.relativePath).toBe('page/sub1/sub2/deep.txt')
  })

  test('读取异常被静默忽略', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockImplementation(() => { throw new Error('读取失败') })
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    expect(deepScanLocalFiles('page', 1)).toEqual([])
  })

  test('所有类型的文件都被收集（不限扩展名）', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([
      makeDirent('html.html', false),
      makeDirent('txt.txt', false),
      makeDirent('png.png', false),
      makeDirent('json.json', false),
    ])
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    const result = deepScanLocalFiles('page', 1)
    expect(result).toHaveLength(4)
  })

  test('使用绝对路径拼接 process.cwd()', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/my/app')
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([makeDirent('file.txt', false)])
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    deepScanLocalFiles('page', 1)
    expect(fsMock.existsSync).toHaveBeenCalledWith(path.join('/my/app', 'public', 'page'))
  })

  test('子目录使用相对路径拼接', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync
      .mockReturnValueOnce([makeDirent('inner', true)])
      .mockReturnValueOnce([makeDirent('data.bin', false)])

    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    const result = deepScanLocalFiles('page', 1)

    // inner 是目录不直接加入, data.bin 是文件加入
    expect(result).toHaveLength(1)
    expect(result[0]!.relativePath).toBe('page/inner/data.bin')
  })

  test('depth=0 从根目录扫描', async () => {
    fsMock.existsSync.mockImplementation(() => true)
    fsMock.readdirSync.mockReturnValue([makeDirent('root.txt', false)])
    const { deepScanLocalFiles } = await import('@/lib/page-source/fs')
    const result = deepScanLocalFiles('', 0)
    expect(result).toHaveLength(1)
    expect(result[0]!.relativePath).toBe('/root.txt')
  })
})
