/**
 * 自定义页面快捷创建 API
 * POST /api/page/create
 *
 * 三重写入策略:
 * 1. WebDAV — 创建目录 + 写入 HTML 文件
 * 2. 本地文件系统 — ./pages/{name}/index.html（运行时立即可读）
 * 3. 数据库 — StorageFolder 元数据记录
 *
 * 认证: 仅限超级管理员(requireSudo)
 */
import fs from 'fs'
import path from 'path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getDb } from '@/lib/db'
import { isWebDavConfigured, getWebDavClient } from '@/lib/webdav'
import { renderTemplate, type TemplateType } from '@/lib/page-templates'

/** 名称白名单:字母、数字、中文、连字符、下划线，1-100 字符 */
const NAME_REGEX = /^[a-zA-Z0-9\u4e00-\u9fff_-]{1,100}$/

/** 本地页面根目录 */
const PAGES_DIR = path.join(process.cwd(), 'pages')

/** 请求体类型 */
interface CreatePageBody {
  name: string
  template: TemplateType
  isPublic: boolean
}

/* ── 辅助函数：降低 handler 复杂度 ── */

/** 校验请求参数，返回错误 Response 或 null */
function validateParams(body: CreatePageBody): NextResponse | null {
  const { name, template } = body
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: '名称不能为空' }, { status: 400 })
  }
  if (!NAME_REGEX.test(name)) {
    return NextResponse.json(
      { error: '名称只能包含字母、数字、中文、连字符和下划线' },
      { status: 400 },
    )
  }
  if (name.includes('.') || name.includes('/') || name.includes('\\')) {
    return NextResponse.json({ error: '名称包含非法字符' }, { status: 400 })
  }
  if (!template || typeof template !== 'string') {
    return NextResponse.json({ error: '模板类型不能为空' }, { status: 400 })
  }
  return null
}

/** 检查本地和数据库是否已有同名页面，返回冲突 Response 或 null */
async function checkDuplicates(name: string): Promise<NextResponse | null> {
  const localDir = path.join(PAGES_DIR, name)
  if (fs.existsSync(localDir)) {
    return NextResponse.json({ error: `页面 "${name}" 已存在` }, { status: 409 })
  }
  const prisma = getDb().prisma
  if (!prisma) return null
  try {
    const existing = await prisma.storageFolder.findUnique({
      where: { path: `pages/${name}` },
    })
    if (existing) {
      return NextResponse.json(
        { error: `页面 "${name}" 的数据库记录已存在` },
        { status: 409 },
      )
    }
  } catch (err) {
    console.error('[page.create] 数据库查询失败:', err)
  }
  return null
}

/** 写入 WebDAV，失败返回错误 Response 或 null */
async function writeToWebDav(name: string, htmlContent: string): Promise<NextResponse | null> {
  const webdavDir = `pages/${name}`
  const webdavFile = `${webdavDir}/index.html`
  try {
    const client = getWebDavClient()
    await client.createDirectory(webdavDir, { recursive: true })
    const writeStream = client.createWriteStream(webdavFile, { overwrite: true })
    await pipeline(Readable.from([Buffer.from(htmlContent, 'utf-8')]), writeStream)
    return null
  } catch (err) {
    return NextResponse.json(
      { error: `WebDAV 写入失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}

/** 写入本地文件系统，失败时回滚 WebDAV 并返回错误 Response 或 null */
async function writeLocal(name: string, htmlContent: string): Promise<NextResponse | null> {
  const localDir = path.join(PAGES_DIR, name)
  try {
    fs.mkdirSync(localDir, { recursive: true })
    fs.writeFileSync(path.join(localDir, 'index.html'), htmlContent, 'utf-8')
    return null
  } catch (err) {
    console.error('[page.create] 本地写入失败，尝试回滚 WebDAV:', err)
    await rollbackWebDav(name)
    return NextResponse.json(
      { error: `本地文件写入失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}

/** 回滚 WebDAV 已创建的文件 */
async function rollbackWebDav(name: string): Promise<void> {
  try {
    const client = getWebDavClient()
    await client.deleteFile(`pages/${name}/index.html`)
    await client.deleteFile(`pages/${name}`)
  } catch {
    console.warn('[page.create] WebDAV 回滚失败，可能存在残留')
  }
}

/** 写入数据库记录（失败不阻断） */
async function writeToDb(name: string, isPublic: boolean): Promise<void> {
  const prisma = getDb().prisma
  if (!prisma) return
  try {
    await prisma.storageFolder.upsert({
      where: { path: `pages/${name}` },
      create: { path: `pages/${name}`, public: isPublic, description: null },
      update: { public: isPublic, updatedAt: new Date() },
    })
  } catch (err) {
    console.warn('[page.create] 数据库写入失败（页面已可用）:', err)
  }
}

/* ── 主 Handler ── */

export const POST = apiHandler('POST', { label: 'page.create', requireSudo: true }, async (req) => {
  let body: CreatePageBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const validateError = validateParams(body)
  if (validateError) return validateError

  if (!isWebDavConfigured()) {
    return NextResponse.json(
      { error: 'WebDAV 未配置，无法创建远程页面', code: 'NOT_CONFIGURED' },
      { status: 503 },
    )
  }

  const duplicateError = await checkDuplicates(body.name)
  if (duplicateError) return duplicateError

  let htmlContent: string
  try {
    htmlContent = renderTemplate(body.template, { title: body.name })
  } catch (err) {
    return NextResponse.json(
      { error: `模板渲染失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  const webdavError = await writeToWebDav(body.name, htmlContent)
  if (webdavError) return webdavError

  const localError = await writeLocal(body.name, htmlContent)
  if (localError) return localError

  await writeToDb(body.name, body.isPublic)

  return NextResponse.json({
    ok: true,
    path: `/page/${body.name}/index.html`,
    name: body.name,
    template: body.template,
    isPublic: body.isPublic,
  })
})
