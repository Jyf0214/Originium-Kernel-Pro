/**
 * 存储池文件内容全文搜索 API
 * GET /api/storage/search?q=keyword
 *
 * 递归列出存储池中所有文本文件，下载内容并搜索关键词（不区分大小写）。
 * 返回匹配的文件列表，每个包含路径、文件名、匹配的上下文片段。
 *
 * 结果缓存 2 分钟（避免重复扫描）。
 * 最多返回 50 条结果。
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { createApiLogger } from '@/lib/api-logger'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { getStorageProvider, isStorageConfigured } from '@/lib/storage/storage-provider'
import { storageNotConfigured, requireApiKeyPerm } from '../_helpers'

const logger = createApiLogger('/api/storage/search')

/* ---------- 类型定义 ---------- */

/** 搜索结果中的单个匹配项 */
interface SearchMatch {
  /** 匹配的上下文片段（前后各 50 字符） */
  snippet: string
  /** 该片段在原始内容中的起始偏移量 */
  offset: number
}

/** 单个搜索结果 */
interface SearchResult {
  /** 文件相对路径 */
  path: string
  /** 文件名 */
  filename: string
  /** 匹配的上下文片段列表 */
  matches: SearchMatch[]
}

/** API 返回结构 */
interface SearchResponse {
  query: string
  fileCount: number
  results: SearchResult[]
  searchedAt: string
  truncated: boolean
}

/** 扫描上下文 */
interface ScanContext {
  provider: { listDirectory: (path: string) => Promise<{ filename: string; type: string }[]> }
  getContent: (path: string) => Promise<string | Buffer | ArrayBuffer | { data: string | Buffer | ArrayBuffer }>
  keyword: string
  results: SearchResult[]
  fileCount: { value: number }
  truncated: { value: boolean }
}

/* ---------- 缓存机制 ---------- */

interface CacheEntry {
  query: string
  result: SearchResponse
  timestamp: number
}

const CACHE_TTL_MS = 2 * 60 * 1000 // 2 分钟
const MAX_RESULTS = 50
const MAX_DEPTH = 5
const SNIPPET_PADDING = 50
const MAX_CACHE_ENTRIES = 10

/** 多条搜索结果缓存，避免交替搜索不同关键词时反复全量扫描 */
const cacheStore = new Map<string, CacheEntry>()

/** 清理过期缓存条目 */
function pruneCache(now: number): void {
  for (const [key, entry] of cacheStore) {
    if (now - entry.timestamp >= CACHE_TTL_MS) {
      cacheStore.delete(key)
    }
  }
  // 超过上限时删除最早插入的条目
  while (cacheStore.size > MAX_CACHE_ENTRIES) {
    const firstKey = cacheStore.keys().next().value
    if (firstKey !== undefined) cacheStore.delete(firstKey)
  }
}

function getCachedResult(query: string): SearchResponse | null {
  const now = Date.now()
  pruneCache(now)
  const entry = cacheStore.get(query)
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.result
  }
  return null
}

function setCachedResult(query: string, result: SearchResponse): void {
  const now = Date.now()
  pruneCache(now)
  cacheStore.set(query, { query, result, timestamp: now })
}

/* ---------- 可搜索的文件扩展名 ---------- */

const SEARCHABLE_EXTENSIONS = new Set([
  '.html', '.md', '.txt', '.json', '.xml', '.css', '.js',
  '.ts', '.tsx', '.jsx', '.yaml', '.yml', '.svg', '.csv',
  '.htm', '.wxml', '.wxss', '.vue', '.svelte',
])

function isSearchable(filename: string): boolean {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return false
  return SEARCHABLE_EXTENSIONS.has(filename.slice(lastDot).toLowerCase())
}

/* ---------- 上下文片段提取 ---------- */

function extractMatches(content: string, keyword: string): SearchMatch[] {
  const lowerContent = content.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const matches: SearchMatch[] = []
  let searchOffset = 0

  while (matches.length < 5) {
    const idx = lowerContent.indexOf(lowerKeyword, searchOffset)
    if (idx === -1) break

    const start = Math.max(0, idx - SNIPPET_PADDING)
    const end = Math.min(content.length, idx + keyword.length + SNIPPET_PADDING)
    let snippet = content.slice(start, end)

    if (start > 0) snippet = `...${snippet}`
    if (end < content.length) snippet = `${snippet}...`

    matches.push({ snippet, offset: idx })
    searchOffset = idx + keyword.length
  }

  return matches
}

/* ---------- 内容转换 ---------- */

function contentToString(raw: string | Buffer | ArrayBuffer | { data: string | Buffer | ArrayBuffer }): string {
  if (typeof raw === 'string') return raw
  if (raw instanceof Buffer) return raw.toString('utf-8')
  if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw)
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const inner = raw.data
    if (typeof inner === 'string') return inner
    if (inner instanceof Buffer) return inner.toString('utf-8')
    return new TextDecoder().decode(inner)
  }
  return ''
}

/* ---------- 递归扫描 ---------- */

async function scanDir(ctx: ScanContext, dirPath: string, depth: number): Promise<void> {
  if (depth > MAX_DEPTH || ctx.truncated.value) return

  let entries: { filename: string; type: string }[]
  try {
    entries = await ctx.provider.listDirectory(dirPath)
  } catch {
    return
  }

  // 并发扫描：所有条目并行处理，目录递归 + 文件读取全部并发
  await Promise.all(entries.map(async (entry) => {
    if (ctx.truncated.value) return

    if (entry.type === 'directory') {
      const subPath = dirPath ? `${dirPath}/${entry.filename}` : entry.filename
      await scanDir(ctx, subPath, depth + 1)
      return
    }

    if (!isSearchable(entry.filename)) return

    const relativePath = dirPath ? `${dirPath}/${entry.filename}` : entry.filename
    try {
      const raw = await ctx.getContent(relativePath)
      const content = contentToString(raw)
      if (!content) return

      const matches = extractMatches(content, ctx.keyword)
      if (matches.length > 0) {
        ctx.fileCount.value += 1
        ctx.results.push({ path: relativePath, filename: entry.filename, matches })
        if (ctx.results.length >= MAX_RESULTS) {
          ctx.truncated.value = true
        }
      }
    } catch {
      // 单个文件读取失败，跳过
    }
  }))
}

/* ---------- API 路由 ---------- */

export const GET = apiHandler(
  'GET',
  { label: 'storage.search', requireAdmin: true },
  async (req) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    // 速率限制：每 IP 每分钟最多 10 次搜索
    const ip = getClientIp(req)
    const { allowed, retryAfterMs } = rateLimit(`${ip}:storage-search`, 10, 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: '搜索过于频繁，请稍后再试' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      )
    }

    // API 密钥权限检查
    const denied = await requireApiKeyPerm('search')
    if (denied) return denied

    const query = req.nextUrl.searchParams.get('q')?.trim()
    if (!query) {
      return NextResponse.json({ error: '搜索关键词不能为空' }, { status: 400 })
    }
    if (query.length < 2) {
      return NextResponse.json({ error: '搜索关键词至少 2 个字符' }, { status: 400 })
    }

    const cachedResult = getCachedResult(query)
    if (cachedResult) {
      return NextResponse.json(cachedResult, {
        headers: { 'Cache-Control': 'private, max-age=120' },
      })
    }

    try {
      const provider = await getStorageProvider()
      const ctx: ScanContext = {
        provider,
        getContent: (fp) => provider.getFileContents(fp),
        keyword: query,
        results: [],
        fileCount: { value: 0 },
        truncated: { value: false },
      }

      await scanDir(ctx, '', 0)

      const response: SearchResponse = {
        query,
        fileCount: ctx.fileCount.value,
        results: ctx.results,
        searchedAt: new Date().toISOString(),
        truncated: ctx.truncated.value,
      }

      setCachedResult(query, response)

      return NextResponse.json(response, {
        headers: { 'Cache-Control': 'private, max-age=120' },
      })
    } catch (err) {
      logger.error('GET', '搜索失败', { error: (err as Error).message })
      return NextResponse.json(
        { error: '搜索失败' },
        { status: 500 },
      )
    }
  }
)
