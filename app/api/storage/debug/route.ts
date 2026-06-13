/**
 * WebDAV 读取诊断端点（管理员 + Koofr REST API）
 * GET /api/storage/debug?path=pages/hello-world/index.html
 */
import { NextResponse } from 'next/server'
import https from 'node:https'
import { getSession } from '@/lib/auth'
import { getWebDavClient, isWebDavConfigured } from '@/lib/webdav'
import { joinPath } from '@/lib/storage/path'

export const dynamic = 'force-dynamic'

type R = Record<string, unknown>

function httpsGet(url: string, auth: string, timeoutMs = 8_000): Promise<{ status: number; body: Buffer; ms: number; error?: string }> {
  const start = Date.now()
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { Authorization: auth } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks), ms: Date.now() - start }))
      res.on('error', (e) => resolve({ status: 0, body: Buffer.alloc(0), ms: Date.now() - start, error: `res:${e.message}` }))
    })
    req.on('error', (e) => resolve({ status: 0, body: Buffer.alloc(0), ms: Date.now() - start, error: `req:${e.message}` }))
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('timeout')); })
  })
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })

  const url = new URL(req.url)
  const relPath = joinPath(url.searchParams.get('path') ?? 'pages/hello-world/index.html')
  const results: R = { path: relPath }

  if (!isWebDavConfigured()) return NextResponse.json({ error: 'WebDAV 未配置' })

  const webdavBase = process.env.WEBDAV_URL!.replace(/\/+$/, '')
  const user = process.env.WEBDAV_USER!
  const pass = process.env.WEBDAV_PASS!
  const auth = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  const encodedPath = relPath.split('/').map(encodeURIComponent).join('/')
  const fullUrl = `${webdavBase}/${encodedPath}`
  results.url = fullUrl

  // 1. PROPFIND stat (已知可行)
  try {
    const start = Date.now()
    const statRaw = await getWebDavClient().stat(relPath)
    results.stat = { ok: true, ms: Date.now() - start, data: JSON.stringify(statRaw).slice(0, 200) }
  } catch (e) { results.stat = { ok: false, error: String(e).slice(0, 150) } }

  // 2. GET 响应头 (不读 body)
  const headResult = await httpsGet(fullUrl, auth, 5_000)
  results.getHeaders = {
    ok: headResult.status === 200,
    status: headResult.status,
    bodyLen: headResult.body.length,
    ms: headResult.ms,
    error: headResult.error,
  }

  // 3. Koofr REST API: 获取挂载列表
  const koofrApiBase = 'https://api.koofr.net/v2'
  try {
    const start = Date.now()
    const mountsResult = await httpsGet(`${koofrApiBase}/accounts/mounts`, auth, 5_000)
    let mounts: unknown = null
    try { mounts = JSON.parse(mountsResult.body.toString('utf8')); } catch { /* not json */ }
    results.koofrMounts = {
      ok: mountsResult.status === 200,
      status: mountsResult.status,
      ms: Date.now() - start,
      error: mountsResult.error,
      data: JSON.stringify(mounts).slice(0, 500),
    }
  } catch (e) { results.koofrMounts = { ok: false, error: String(e).slice(0, 150) } }

  // 4. Koofr REST API: 用 content 端点下载文件 (尝试已知 mountId)
  for (const mountId of ['none', 'appdata']) {
    try {
      const start = Date.now()
      const apiUrl = `${koofrApiBase}/files/${mountId}/content?path=/${encodedPath}`
      const dlResult = await httpsGet(apiUrl, auth, 8_000)
      results[`koofrDl_${mountId}`] = {
        ok: dlResult.status === 200 && dlResult.body.length > 0,
        status: dlResult.status,
        bodyLen: dlResult.body.length,
        preview: dlResult.body.toString('utf8').slice(0, 100),
        ms: Date.now() - start,
        error: dlResult.error,
      }
    } catch (e) { results[`koofrDl_${mountId}`] = { ok: false, error: String(e).slice(0, 150) } }
  }

  // 5. PROPFIND getDirectoryContents 看文件系统结构
  try {
    const start = Date.now()
    const client = getWebDavClient()
    const contents = await client.getDirectoryContents('', { deep: false }) as unknown[]
    results.rootListing = {
      ok: true,
      ms: Date.now() - start,
      count: contents.length,
      items: contents.map((c: unknown) => {
        const item = c as Record<string, unknown>;
        return { name: item.basename, type: item.type, size: item.size };
      }),
    }
  } catch (e) { results.rootListing = { ok: false, error: String(e).slice(0, 150) } }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
