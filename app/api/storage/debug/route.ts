/**
 * WebDAV 读取诊断端点（仅管理员可调用）
 * GET /api/storage/debug?path=pages/hello-world/index.html
 *
 * 依次尝试所有可能的文件读取方式并报告结果。
 * 用完即删。
 */
import { NextResponse } from 'next/server'
import https from 'node:https'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { joinPath } from '@/lib/storage/path'

export const dynamic = 'force-dynamic'

type R = Record<string, unknown>

function httpsGet(url: string, auth: string, timeoutMs = 10_000): Promise<{ status: number; bodyLen: number; bodyPreview: string; ms: number; error?: string }> {
  const start = Date.now()
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { Authorization: auth, Accept: '*/*', 'User-Agent': 'webdav-client/5.10.0' },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        resolve({ status: res.statusCode ?? 0, bodyLen: buf.length, bodyPreview: buf.toString('utf8').slice(0, 200), ms: Date.now() - start })
      })
      res.on('error', (e) => resolve({ status: 0, bodyLen: 0, bodyPreview: '', ms: Date.now() - start, error: `res error: ${e.message}` }))
    })
    req.on('error', (e) => resolve({ status: 0, bodyLen: 0, bodyPreview: '', ms: Date.now() - start, error: `req error: ${e.message}` }))
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timeout')); })
  })
}

async function tryStat(relPath: string): Promise<R> {
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const statRaw = await client.stat(relPath)
    return { ok: true, ms: Date.now() - start, data: JSON.stringify(statRaw).slice(0, 300) }
  } catch (e) { return { ok: false, error: String(e) } }
}

async function tryGetFileContents(relPath: string, format: 'text' | 'binary'): Promise<R> {
  try {
    const client = getWebDavClient()
    const start = Date.now()
    if (format === 'text') {
      const content = await client.getFileContents(relPath, { format: 'text' }) as string
      return { ok: true, ms: Date.now() - start, len: content.length, preview: content.slice(0, 200) }
    }
    const buf = await client.getFileContents(relPath, { format: 'binary' }) as ArrayBuffer
    return { ok: true, ms: Date.now() - start, len: buf.byteLength }
  } catch (e) { return { ok: false, error: String(e).slice(0, 300) } }
}

async function tryCustomRequest(relPath: string): Promise<R> {
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const resp = await client.customRequest(relPath, { method: 'GET' })
    const text = await resp.text()
    return { ok: resp.status < 400, status: resp.status, ms: Date.now() - start, len: text.length, preview: text.slice(0, 200) }
  } catch (e) { return { ok: false, error: String(e).slice(0, 300) } }
}

async function tryGlobalFetch(fullUrl: string, auth: string, extraHeaders?: Record<string, string>): Promise<R> {
  try {
    const start = Date.now()
    const resp = await fetch(fullUrl, { headers: { Authorization: auth, ...extraHeaders } })
    const buf = await resp.arrayBuffer()
    return { ok: resp.ok, status: resp.status, ms: Date.now() - start, len: buf.byteLength }
  } catch (e) { return { ok: false, error: String(e).slice(0, 300) } }
}

async function tryCreateReadStream(relPath: string): Promise<R> {
  try {
    const client = getWebDavClient()
    const start = Date.now()
    const stream = client.createReadStream(relPath)
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    const buf = Buffer.concat(chunks)
    return { ok: true, ms: Date.now() - start, len: buf.length, preview: buf.toString('utf8').slice(0, 200) }
  } catch (e) { return { ok: false, error: String(e).slice(0, 300) } }
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })

  const url = new URL(req.url)
  const rawPath = url.searchParams.get('path') ?? 'pages/hello-world/index.html'
  const relPath = joinPath(rawPath)

  const results: R = { path: relPath }

  results.env = {
    WEBDAV_URL: (process.env.WEBDAV_URL ?? '').substring(0, 30) + '...',
    WEBDAV_USER: process.env.WEBDAV_USER ? '***' : '(缺失)',
    WEBDAV_PASS: process.env.WEBDAV_PASS ? '***' : '(缺失)',
    configured: isWebDavConfigured(),
  }

  if (!isWebDavConfigured()) return NextResponse.json(results)

  const webdavBase = process.env.WEBDAV_URL!.replace(/\/+$/, '')
  const auth = `Basic ${Buffer.from(`${process.env.WEBDAV_USER}:${process.env.WEBDAV_PASS}`).toString('base64')}`
  const encodedPath = relPath.split('/').map(encodeURIComponent).join('/')
  const fullUrl = `${webdavBase}/${encodedPath}`
  results.url = fullUrl

  results.stat = await tryStat(relPath)
  results.getFileContents_text = await tryGetFileContents(relPath, 'text')
  results.getFileContents_binary = await tryGetFileContents(relPath, 'binary')
  results.customRequest_GET = await tryCustomRequest(relPath)
  results.httpsGet_header = await httpsGet(fullUrl, auth)
  results.globalFetch = await tryGlobalFetch(fullUrl, auth)
  results.rangeFetch = await tryGlobalFetch(fullUrl, auth, { Range: 'bytes=0-762' })
  results.createReadStream = await tryCreateReadStream(relPath)

  try {
    const client = getWebDavClient()
    const start = Date.now()
    const contents = await client.getDirectoryContents('pages/hello-world', { deep: false }) as unknown[]
    results.listDir = { ok: true, ms: Date.now() - start, count: contents.length, data: JSON.stringify(contents).slice(0, 500) }
  } catch (e) { results.listDir = { ok: false, error: String(e).slice(0, 300) } }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
