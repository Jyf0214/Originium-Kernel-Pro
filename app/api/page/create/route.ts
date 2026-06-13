/**
 * 自定义页面快捷创建 API
 * POST /api/page/create
 *
 * 写入策略:
 * 1. WebDAV — 创建目录 + 写入 HTML 文件（唯一数据源）
 *
 * 本地 ./pages/ 目录由构建时 sync-pages.mjs 从 WebDAV 同步，运行时不应写入。
 *
 * 认证: 仅限超级管理员(requireSudo)
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { isStorageConfigured, getStorageProvider } from '@/lib/storage/storage-provider'
import { renderTemplate, type TemplateType } from '@/lib/page-templates'

/** 名称白名单:字母、数字、中文、连字符、下划线，1-100 字符 */
const NAME_REGEX = /^[a-zA-Z0-9\u4e00-\u9fff_-]{1,100}$/

/** 请求体类型 */
interface CreatePageBody {
  name: string
  template: TemplateType
  isPublic: boolean
}

/* ── 辅助函数 ── */

/** 校验请求参数 */
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

/** 写入存储后端（等待服务端确认写入） */
async function writeToStorage(name: string, htmlContent: string): Promise<NextResponse | null> {
  const storageDir = `pages/${name}`
  const storageFile = `${storageDir}/index.html`
  try {
    const provider = await getStorageProvider()
    await provider.createDirectory(storageDir, { recursive: true })
    await provider.putFileContents(storageFile, Buffer.from(htmlContent, 'utf-8'), { headers: { overwrite: 'true' } })
    return null
  } catch (err) {
    return NextResponse.json(
      { error: `存储写入失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
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

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: '存储后端未配置，无法创建页面', code: 'NOT_CONFIGURED' },
      { status: 503 },
    )
  }

  let htmlContent: string
  try {
    htmlContent = renderTemplate(body.template, { title: body.name })
  } catch (err) {
    return NextResponse.json(
      { error: `模板渲染失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }

  const storageError = await writeToStorage(body.name, htmlContent)
  if (storageError) return storageError

  return NextResponse.json({
    ok: true,
    path: `/page/${body.name}/index.html`,
    name: body.name,
    template: body.template,
    isPublic: body.isPublic,
  })
})
