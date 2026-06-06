/**
 * 存储池文件夹元数据列表
 * GET /api/storage/folders
 * 读取 KV 中所有 storage-folder-meta:* 记录
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { listAllFolderMetas } from '../_helpers'

export const GET = apiHandler(
  'GET',
  { label: 'storage.folders', requireAdmin: true },
  async () => {
    const folders = await listAllFolderMetas()
    return NextResponse.json({ folders })
  }
)
