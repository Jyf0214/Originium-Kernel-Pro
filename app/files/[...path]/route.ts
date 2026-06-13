/**
 * 存储池 / WebDAV 文件下载代理
 *
 * GET /files/[...path]
 *
 * 三层设计:
 * 1. webdav 库 stat() → 校验文件存在 + 获取元信息(PROPFIND,已验证稳定)
 * 2. Node.js 原生 https.get() → 下载文件体(绕过 node-fetch / fetch polyfill)
 * 3. Buffer → NextResponse
 *
 * 为何不用 webdav 库 getFileContents / 全局 fetch():
 *   webdav 库内部走 @buttercup/fetch → node-fetch,
 *   全局 fetch 在 Vercel runtime 走 undici polyfill,
 *   两者对 Koofr WebDAV 的 GET 响应体读取均会报 aborted / terminated.
 *   绕过方案:直接用 Node.js 原生 https 模块,无任何 fetch 抽象层。
 */
import { type NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { checkAccess } from '@/lib/storage/acl'
import { isValidPath, joinPath } from '@/lib/storage/path'
import type { FileStat, ResponseDataDetailed } from 'webdav'

interface RouteParams { path: string[] }

function unwrapStat(raw: FileStat | ResponseDataDetailed<FileStat>): FileStat {
  if (
    typeof (raw as ResponseDataDetailed<FileStat>).data === 'object' &&
    (raw as ResponseDataDetailed<FileStat>).data !== null &&
    'filename' in (raw as ResponseDataDetailed<FileStat>).data
  ) return (raw as ResponseDataDetailed<FileStat>).data
  return raw as FileStat
}

/** Node.js 原生 HTTPS 下载:返回 Buffer + HTTP 状态码 */
function httpsGet(url: string, authorization: string): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Authorization: authorization,
        'User-Agent': 'webdav-client/5.10.0',
        Accept: '*/*',
        'Accept-Encoding': 'identity',
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 500, body: Buffer.concat(chunks) }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15_000, () => { req.destroy(new Error('timeout 15s')) })
  })
}

function debugResponse(relativePath: string, stat: FileStat, statMs: number): NextResponse {
  return NextResponse.json({
    relativePath,
    stat: { type: stat.type, size: stat.size, mime: stat.mime, lastmod: stat.lastmod },
    statMs,
    webdavUrl: (process.env.WEBDAV_URL ?? '').substring(0, 40) + '...',
  })
}

function accessDenied(reason: string | undefined): NextResponse {
  if (reason === 'not-found') return NextResponse.json({ error: '资源不存在' }, { status: 404 })
  if (reason === 'not-configured') return NextResponse.json({ error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' }, { status: 503 })
  return NextResponse.json({ error: '请先登录' }, { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Storage"' } })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  let relativePath = ''
  try {
    const { path: segments } = await params
    relativePath = joinPath(...segments)
    const start = performance.now()

    if (!relativePath || !isValidPath(relativePath)) {
      return NextResponse.json({ error: '路径非法' }, { status: 400 })
    }
    if (!isWebDavConfigured()) {
      return NextResponse.json({ error: 'WebDAV 未配置', code: 'NOT_CONFIGURED' }, { status: 503 })
    }

    const session = await getSession()
    const access = await checkAccess(relativePath, !!session)
    if (!access.allowed) return accessDenied('reason' in access ? access.reason : undefined)

    const client = getWebDavClient()
    let stat: FileStat
    try {
      const statRaw = await client.stat(relativePath)
      stat = unwrapStat(statRaw)
    } catch (statErr) {
      console.error(`[files] stat 失败 path="${relativePath}" error="${statErr}"`)
      throw statErr
    }
    if (stat.type === 'directory') return NextResponse.json({ error: '资源不存在' }, { status: 404 })
    console.warn(`[files] stat OK path="${relativePath}" type=${stat.type} size=${stat.size} 耗时=${Math.round(performance.now() - start)}ms`)

    if (new URL(_req.url).searchParams.get('_debug') === '1') {
      return debugResponse(relativePath, stat, Math.round(performance.now() - start))
    }

    // Node.js 原生 HTTPS 直连 WebDAV(绕过所有 fetch 抽象层)
    const webdavUrl = process.env.WEBDAV_URL!.replace(/\/+$/, '')
    const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/')
    const url = `${webdavUrl}/${encodedPath}`
    const authorization = `Basic ${Buffer.from(`${process.env.WEBDAV_USER}:${process.env.WEBDAV_PASS}`).toString('base64')}`

    const { status: upstreamStatus, body } = await httpsGet(url, authorization)
    console.warn(`[files] httpsGet 完成 path="${relativePath}" status=${upstreamStatus} bodyLen=${body.length}`)
    if (upstreamStatus >= 400) {
      console.warn(`[files] upstream ${upstreamStatus} path="${relativePath}"`)
      return NextResponse.json({ error: `上游 ${upstreamStatus}` }, { status: upstreamStatus })
    }
    console.warn(`[files] GET path="${relativePath}" size=${body.length} 耗时=${Math.round(performance.now() - start)}ms`)

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': stat.mime ?? 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': stat.mime === 'text/html' ? 'attachment' : 'inline',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error(`[files] 未捕获异常 path="${relativePath || '?'}" error="${msg}"`)
    return NextResponse.json({ error: `内部错误: ${msg}` }, { status: 500 })
  }
}
