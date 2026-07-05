/**
 * 自定义页面 SDK — 评论端点
 *
 * GET    /api/page/sdk/comments?pagePath=xxx  — 获取评论列表
 * POST   /api/page/sdk/comments               — 发表评论
 * DELETE /api/page/sdk/comments?id=xxx         — 删除评论（仅自己的）
 *
 * 评论存储在 WebDAV/B2 的 comments/{pagePath}.json
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getSession } from '@/lib/auth'
import { isStorageConfigured, getStorageProvider } from '@/lib/storage/storage-provider'
import { normalizeWebDavContent } from '@/lib/page-source/shared'
import { checkRateLimit } from '@/lib/rate-limit'

/** 评论数据结构 */
interface Comment {
  id: string
  pagePath: string
  userId: string | null
  userName: string
  content: string
  createdAt: string
}

/** 最多 500 条评论 */
const MAX_COMMENTS = 500
const MAX_CONTENT_LEN = 2000
const MAX_USERNAME_LEN = 50

/** 评论存储路径：comments/{encoded-pagePath}.json */
function commentFilePath(pagePath: string): string {
  // 将路径中的 / 替换为 __ 以避免嵌套目录问题
  const safe = pagePath.replace(/\//g, '__').replace(/^__/, '')
  return `comments/${safe}.json`
}

/** 写入互斥锁：同一时间只允许一个写操作执行，防止并发读-改-写导致评论丢失 */
let writeLock: Promise<void> | null = null;

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  while (writeLock) {
    await writeLock;
  }
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  writeLock = promise;
  try {
    return await fn();
  } finally {
    writeLock = null;
    resolve!();
  }
}

/** 读取评论文件 */
async function readComments(pagePath: string): Promise<Comment[]> {
  if (!isStorageConfigured()) return []
  try {
    const provider = await getStorageProvider()
    const raw = await provider.getFileContents(commentFilePath(pagePath))
    if (raw === null || raw === undefined) return []
    const text = normalizeWebDavContent(raw)
    if (!text) return []
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return []
    return data.slice(-MAX_COMMENTS) // 只保留最近 500 条
  } catch {
    return []
  }
}

/** 写入评论文件 */
async function writeComments(pagePath: string, comments: Comment[]): Promise<boolean> {
  if (!isStorageConfigured()) return false
  try {
    const provider = await getStorageProvider()
    const filePath = commentFilePath(pagePath)
    const content = JSON.stringify(comments.slice(-MAX_COMMENTS), null, 2)
    // 确保目录存在
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
    try { await provider.createDirectory(dirPath, { recursive: true }) } catch { /* 忽略 */ }
    await provider.putFileContents(filePath, Buffer.from(content, 'utf-8'), { headers: { overwrite: 'true' } })
    return true
  } catch (err) {
    console.error(`[page-sdk] 写入评论失败: ${pagePath}`, err)
    return false
  }
}

/** GET — 获取评论列表 */
export const GET = apiHandler('GET', { label: 'page-sdk.comments.get' }, async (req) => {
  const pagePath = req.nextUrl.searchParams.get('pagePath')
  if (!pagePath?.startsWith('/page/')) {
    return NextResponse.json({ error: 'pagePath 参数无效' }, { status: 400 })
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ comments: [], error: '存储后端未配置' }, { status: 503 })
  }
  const comments = await readComments(pagePath)
  return NextResponse.json({ comments })
})

/** 从会话或匿名输入中解析最终用户名 */
async function resolveUserName(
  session: Awaited<ReturnType<typeof getSession>>,
  fallbackName?: string
): Promise<string> {
  if (session) {
    try {
      const { getDb } = await import('@/lib/db')
      const db = getDb()
      if (db.prisma) {
        const u = await db.prisma.user.findUnique({ where: { uid: session.uid }, select: { name: true } })
        return u?.name ?? '匿名用户'
      }
    } catch { /* 忽略 */ }
    return '匿名用户'
  }
  return typeof fallbackName === 'string' && fallbackName.trim().length > 0 && fallbackName.length <= MAX_USERNAME_LEN
    ? fallbackName.trim()
    : '匿名用户'
}

/** POST — 发表评论 */
export const POST = apiHandler('POST', { label: 'page-sdk.comments.post' }, async (req) => {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: '存储后端未配置' }, { status: 503 })
  }

  // IP 频率限制：每分钟最多 10 条评论
  const rl = checkRateLimit(req, 'comment-post', 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: '评论过于频繁，请稍后再试' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const { pagePath, content, userName } = (body ?? {}) as Record<string, unknown>
  if (typeof pagePath !== 'string' || !pagePath.startsWith('/page/')) {
    return NextResponse.json({ error: 'pagePath 无效' }, { status: 400 })
  }
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > MAX_CONTENT_LEN) {
    return NextResponse.json({ error: `评论内容不能为空且不能超过 ${MAX_CONTENT_LEN} 字` }, { status: 400 })
  }

  const session = await getSession()
  const finalUserName = await resolveUserName(session, typeof userName === 'string' ? userName : undefined)

  const comment: Comment = {
    id: crypto.randomUUID(),
    pagePath,
    userId: session?.uid ?? null,
    userName: finalUserName,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }

  // 使用写锁序列化读-改-写操作，防止并发请求导致评论丢失
  const ok = await withWriteLock(async () => {
    const comments = await readComments(pagePath)
    comments.push(comment)
    return await writeComments(pagePath, comments)
  })
  if (!ok) {
    return NextResponse.json({ error: '评论保存失败' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, comment })
})

/** DELETE — 删除评论（仅限自己的） */
export const DELETE = apiHandler('DELETE', { label: 'page-sdk.comments.delete' }, async (req) => {
  const id = req.nextUrl.searchParams.get('id')
  const pagePath = req.nextUrl.searchParams.get('pagePath')
  if (!id || !pagePath) {
    return NextResponse.json({ error: '缺少 id 或 pagePath 参数' }, { status: 400 })
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: '存储后端未配置' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  // 使用写锁序列化读-改-写操作，防止并发请求导致评论丢失
  const deleteResult = await withWriteLock(async () => {
    const comments = await readComments(pagePath)
    const comment = comments.find((c) => c.id === id)
    if (!comment) {
      return { error: '评论不存在' as const }
    }

    // 只能删自己的评论（管理员可删全部）
    if (comment.userId !== session.uid && session.role !== 'admin' && session.role !== 'sudo') {
      return { error: '无权删除此评论' as const }
    }

    const idx = comments.indexOf(comment)
    comments.splice(idx, 1)
    const ok = await writeComments(pagePath, comments)
    if (!ok) {
      return { error: '删除失败' as const }
    }

    return { ok: true }
  })

  if ('error' in deleteResult) {
    const status = deleteResult.error === '评论不存在' ? 404
      : deleteResult.error === '无权删除此评论' ? 403
      : 500
    return NextResponse.json({ error: deleteResult.error }, { status })
  }

  return NextResponse.json({ ok: true })
})
