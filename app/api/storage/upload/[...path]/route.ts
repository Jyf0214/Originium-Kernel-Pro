/**
 * 上传文件到存储池
 * POST /api/storage/upload/[...path]
 * 请求体:原始二进制流(请求体即文件内容)
 * 大小上限 50MB;超限返回 413
 *
 * 流式读取请求体,通过 TransformStream 实时累计字节数,超限时立即终止;
 * 完整数据收集后通过 StorageProvider.putFileContents() 写入。
 */
import { NextResponse } from 'next/server'
import { createApiLogger } from '@/lib/api-logger'
import {
  MAX_UPLOAD_SIZE,
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getStorageProvider,
  invalidPathResponse,
  isValidStoragePath,
  isStorageConfigured,
  payloadTooLargeResponse,
  resolveStoragePath,
  storageErrorResponse,
  storageNotConfigured,
  requireApiKeyPerm,
} from '../../_helpers'

const logger = createApiLogger('/api/storage/upload')

/** 被禁止的文件扩展名（可执行、可注入脚本、或其他高风险类型） */
const BLOCKED_EXTENSIONS = new Set([
  '.svg', '.svgz',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.exe', '.msi', '.bat', '.cmd', '.com', '.pif',
  '.sh', '.bash', '.zsh', '.csh', '.ksh',
  '.ps1', '.psm1', '.psd1',
  '.vbs', '.vbe', '.wsf', '.wsh',
  '.scr', '.jar', '.class',
])

/** 允许上传的 MIME 类型白名单（仅限安全的图片、文本和文档类型） */
const ALLOWED_MIME_TYPES = new Set([
  // 图片类型
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  // 文本类型
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/markdown',
  'text/csv',
  'text/xml',
  'text/yaml',
  'text/tab-separated-values',
  // 结构化数据
  'application/json',
  'application/xml',
  'application/yaml',
  // 文档类型
  'application/pdf',
  // 字体（前端页面可能引用）
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-woff',
  'application/x-font-woff2',
])

/** 从路径中提取文件扩展名（小写），无扩展名返回空字符串 */
function getExtension(filePath: string): string {
  const lastSeg = filePath.split('/').pop() ?? ''
  const dotIdx = lastSeg.lastIndexOf('.')
  if (dotIdx <= 0) return ''
  return lastSeg.slice(dotIdx).toLowerCase()
}

/** 校验上传文件扩展名是否安全，被阻止时返回 400 响应，否则返回 null */
function validateUploadExtension(relPath: string): NextResponse | null {
  const ext = getExtension(relPath)
  if (ext !== '' && BLOCKED_EXTENSIONS.has(ext)) {
    logger.warn('validateUploadExtension', `拒绝上传: 扩展名 "${ext}" 在黑名单中 path="${relPath}"`)
    return NextResponse.json(
      { error: '不支持的文件类型', blocked: ext },
      { status: 400 },
    )
  }
  return null
}

/** 校验上传文件的 MIME 类型是否在白名单中，不合规时返回 400 响应，否则返回 null */
function validateMimeType(contentType: string | null, relPath: string): NextResponse | null {
  if (!contentType) {
    // 未提供 Content-Type 时，根据扩展名判断是否必须提供
    const ext = getExtension(relPath)
    if (ext !== '' && BLOCKED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: '缺少 Content-Type 头，无法验证文件类型' },
        { status: 400 },
      )
    }
    // 无 Content-Type 且扩展名不在黑名单中，放行（兼容部分客户端不发送 Content-Type 的情况）
    return null
  }

  // 提取主类型（去除分号后的参数，如 "text/html; charset=utf-8" → "text/html"）
  const mimeType = (contentType.split(';')[0] ?? contentType).trim().toLowerCase()

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    logger.warn('validateMimeType', `拒绝上传: MIME 类型 "${mimeType}" 不在白名单中 path="${relPath}"`)
    return NextResponse.json(
      { error: '不支持的文件 MIME 类型', contentType: mimeType },
      { status: 400 },
    )
  }
  return null
}

/** 快速拒绝 Content-Length 超限请求 */
function rejectIfOversized(contentLengthHeader: string | null): NextResponse | null {
  if (contentLengthHeader === null) return null
  const declared = Number(contentLengthHeader)
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_SIZE) {
    return payloadTooLargeResponse(declared)
  }
  return null
}

/** 流式读取请求体为 Buffer，带实时大小限制 */
async function readBodyWithSizeLimit(
  body: ReadableStream<Uint8Array>,
  target: string,
): Promise<{ buffer: Buffer; bytesReceived: number } | NextResponse> {
  let bytesReceived = 0
  let sizeExceeded = false
  const sizeGuard = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesReceived += chunk.byteLength
      if (bytesReceived > MAX_UPLOAD_SIZE) {
        sizeExceeded = true
        controller.error(new Error('payload-too-large'))
        return
      }
      controller.enqueue(chunk)
    },
  })
  const guarded = body.pipeThrough(sizeGuard)

  try {
    const reader = guarded.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return { buffer: Buffer.concat(chunks), bytesReceived }
  } catch (err) {
    if (sizeExceeded) {
      logger.warn('readBodyWithSizeLimit', `target="${target}" 超限 size=${bytesReceived} bytes`)
      return payloadTooLargeResponse(bytesReceived)
    }
    logger.error('readBodyWithSizeLimit', `target="${target}" 读取失败`, { error: (err as Error).message })
    return storageErrorResponse(err, '上传文件')
  }
}

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.upload', requireAdmin: true },
  async (req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const denied = await requireApiKeyPerm('storage_write')
    if (denied) return denied

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (!isValidStoragePath(rel) || rel === '') return invalidPathResponse()

    const blocked = validateUploadExtension(rel)
    if (blocked) return blocked

    // MIME 类型白名单校验，防止上传伪装扩展名的恶意文件
    const mimeBlocked = validateMimeType(req.headers.get('content-type'), rel)
    if (mimeBlocked) return mimeBlocked

    const target = buildWebDavTarget(parts)

    const rejected = rejectIfOversized(req.headers.get('content-length'))
    if (rejected) return rejected

    if (!req.body) {
      return NextResponse.json({ error: '请求体为空' }, { status: 400 })
    }

    const result = await readBodyWithSizeLimit(req.body, target)
    if (result instanceof NextResponse) return result
    const { buffer, bytesReceived } = result

    try {
      const provider = await getStorageProvider()
      await provider.putFileContents(target, buffer, { headers: { overwrite: 'true' } })
    } catch (err) {
      logger.error('POST', `target="${target}" 写入失败`, { error: (err as Error).message })
      return storageErrorResponse(err, '上传文件')
    }

    logger.info('POST', `target="${target}" size=${bytesReceived} bytes`)
    return NextResponse.json({
      path: target,
      size: bytesReceived,
      uploadedAt: new Date().toISOString(),
    })
  }
)
