/**
 * 存储池文件夹元数据列表
 * GET /api/storage/folders
 * 读取 Prisma `storageFolder` 表全部记录(按路径升序)
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getDb } from '@/lib/db'
import {
  databaseNotConfigured,
  isStorageConfigured,
  listAllFolderMetas,
  storageNotConfigured,
} from '../_helpers'

export const GET = apiHandler(
  'GET',
  { label: 'storage.folders', requireAdmin: true },
  async () => {
    if (!isStorageConfigured()) return storageNotConfigured()
    if (!getDb().prisma) return databaseNotConfigured()
    const folders = await listAllFolderMetas()
    console.warn(`[storage.folders] 共 ${folders.length} 个文件夹元数据`)
    return NextResponse.json({ folders })
  }
)
