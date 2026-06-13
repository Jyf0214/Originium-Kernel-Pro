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
} from '../../_helpers'

export const POST = catchAllHandler<{ path: string[] }>(
  'POST',
  { label: 'storage.upload', requireAdmin: true },
  async (req, context) => {
    if (!isStorageConfigured()) return storageNotConfigured()

    const parts = await getPathParts(context)
    const rel = resolveStoragePath(parts)
    if (!isValidStoragePath(rel) || rel === '') return invalidPathResponse()
    const target = buildWebDavTarget(parts)

    // Content-Length 快速拒绝(避免对超大请求也分配流处理管线)
    const contentLengthHeader = req.headers.get('content-length')
    if (contentLengthHeader !== null) {
      const declared = Number(contentLengthHeader)
      if (Number.isFinite(declared) && declared > MAX_UPLOAD_SIZE) {
        return payloadTooLargeResponse(declared)
      }
    }

    if (!req.body) {
      return NextResponse.json({ error: '请求体为空' }, { status: 400 })
    }

    // 实时累计字节数,超限时立即终止
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
    const guarded = req.body.pipeThrough(sizeGuard)

    // 收集完整 body 为 Buffer
    let buffer: Buffer
    try {
      const reader = guarded.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      buffer = Buffer.concat(chunks)
    } catch (err) {
      if (sizeExceeded) {
        console.warn(`[storage.upload] target="${target}" 超限 size=${bytesReceived} bytes`)
        return payloadTooLargeResponse(bytesReceived)
      }
      console.error(`[storage.upload] target="${target}" 读取失败`, err)
      return storageErrorResponse(err, '上传文件')
    }

    // 通过 StorageProvider 写入
    try {
      const provider = await getStorageProvider()
      await provider.putFileContents(target, buffer, { headers: { overwrite: 'true' } })
    } catch (err) {
      console.error(`[storage.upload] target="${target}" 写入失败`, err)
      return storageErrorResponse(err, '上传文件')
    }

    console.warn(`[storage.upload] target="${target}" size=${bytesReceived} bytes`)
    return NextResponse.json({
      path: target,
      size: bytesReceived,
      uploadedAt: new Date().toISOString(),
    })
  }
)
