/**
 * 上传文件到存储池
 * POST /api/storage/upload/[...path]
 * 请求体:multipart/form-data,字段名 file
 * 大小上限 50MB;超限返回 413
 */
import { NextResponse } from 'next/server'
import {
  MAX_UPLOAD_SIZE,
  buildWebDavTarget,
  catchAllHandler,
  getPathParts,
  getWebDavClient,
  invalidPathResponse,
  isValidStoragePath,
  isWebDavConfigured,
  payloadTooLargeResponse,
  resolveStoragePath,
  webdavErrorResponse,
  webdavNotConfigured,
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.upload', requireAdmin: true },
  async (req, context) => {
    if (!isWebDavConfigured()) return webdavNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (!isValidStoragePath(rel) || rel === '') return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: '请求体不是合法 multipart/form-data' }, { status: 400 })
    }
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '缺少 file 字段' }, { status: 400 })
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return payloadTooLargeResponse(file.size)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      const client = getWebDavClient()
      await client.putFileContents(target, buffer, { overwrite: true })
    } catch (err) {
      return webdavErrorResponse(err, '上传文件')
    }

    return NextResponse.json({
      path: target,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    })
  }
)
