/**
 * 存储池全局配置状态查询
 * GET /api/storage/config
 * 返回 WebDAV 是否配置 + 数据库已记录文件夹数量
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { createApiLogger } from '@/lib/api-logger'
import { isStorageConfigured, listAllFolderMetas, requireApiKeyPerm } from '../_helpers'

const logger = createApiLogger('/api/storage/config')

export const GET = apiHandler(
  'GET',
  { label: 'storage.config', requireAdmin: true },
  async () => {
    const denied = await requireApiKeyPerm('settings_read')
    if (denied) return denied

    const configured = isStorageConfigured()
    // 未配置时也允许读 folder 数量(只读 KV,不依赖存储后端)
    const folders = configured ? await listAllFolderMetas() : []
    logger.info('GET', `storage=${configured} folderCount=${folders.length}`)
    return NextResponse.json({
      configured,
      folderCount: folders.length,
    })
  }
)
