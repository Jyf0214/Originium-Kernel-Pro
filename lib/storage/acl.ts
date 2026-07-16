/**
 * 存储池 ACL(访问控制)模块
 *
 * 核心原则:
 * - 未配置的文件夹默认私有(失败安全)
 * - 文件夹元数据走 Prisma `storageFolder` 表(StorageFolder model)
 * - 数据库未配置(`db.prisma` 为 null) → 视为「未配置」,所有读函数返回 false
 * - 顶层文件夹可见性决定子项:子路径与顶层共享同一权限
 */
import { getDb } from '@/lib/db'
import { isStorageConfigured } from '@/lib/storage/storage-provider'
import type { AccessResult, StorageFolderMeta } from './types'

/**
 * 规范化路径:去除前导/尾随斜杠,空字符串代表根
 *
 * @example
 * normalizePath('/a/b/')  // 'a/b'
 * normalizePath('a/b')    // 'a/b'
 * normalizePath('')       // ''
 * normalizePath('///')    // ''
 */
export function normalizePath(path: string): string {
  return path.replace(/^[\\/]+|[\\/]+$/g, '')
}

/**
 * 提取顶层文件夹名
 *
 * - `covers/2024/img.png` → `'covers'`
 * - `img.png` → `''`(顶层文件,根目录)
 * - `''` → `''`
 * - `/a/b` → `'a'`(先规范化)
 */
export function getTopLevelFolder(path: string): string {
  const normalized = normalizePath(path)
  if (!normalized) return ''
  const firstSlash = normalized.indexOf('/')
  if (firstSlash === -1) return ''
  return normalized.substring(0, firstSlash)
}

/**
 * 从 Prisma `storageFolder` 表读取单条文件夹元数据
 *
 * 返回值:
 * - 找到 → 标准化为 `StorageFolderMeta`(Date 类型)
 * - 数据库未配置 → null
 * - 记录不存在 → null
 * - 异常 → null(失败安全)
 */
async function readFolderMetaFromDb(path: string): Promise<StorageFolderMeta | null> {
  const prisma = getDb().prisma
  if (!prisma) return null
  try {
    const row = await prisma.storageFolder.findUnique({ where: { path } })
    if (!row) return null
    return {
      path: row.path,
      public: row.public,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  } catch {
    // 读取异常视为不存在(失败安全)
    return null
  }
}

/**
 * 检查数据库中是否存在该路径的文件夹元数据
 *
 * 仅当数据库中有显式记录时才返回 true;
 * 未配置 → false;读取异常 → false(失败安全)。
 */
export async function isFolderConfigured(path: string): Promise<boolean> {
  const meta = await readFolderMetaFromDb(path)
  return meta !== null
}

/**
 * 检查文件夹是否对未登录用户公开
 *
 * - 未配置 → false(默认私有,失败安全)
 * - 配置但 public=false → false
 * - 配置且 public=true → true
 * - 异常 → false(失败安全)
 */
export async function isFolderPublic(path: string): Promise<boolean> {
  try {
    const meta = await readFolderMetaFromDb(path)
    if (!meta) return false
    return meta.public
  } catch {
    return false
  }
}

/**
 * 综合 ACL 校验入口
 *
 * 决策树:
 * 1. WebDAV 未配置 → 拒绝(返回 `not-configured`)
 * 2. 路径为空或仅含分隔符(根目录) → 拒绝(返回 `not-found`)
 *    根目录属于管理员自留,不允许公开访问
 * 3. 提取顶层文件夹 → 检查其是否 public
 *    - 数据库无记录 → 私有
 *    - 记录存在但 public=false → 私有
 *    - 记录存在且 public=true → 允许未登录访问
 * 4. 已登录用户 → 顶层文件夹存在的即可访问(未配置也允许管理员本地)
 *
 * 任何读取异常 → 拒绝(失败安全)
 */
export async function checkAccess(
  relativePath: string,
  isAuthenticated: boolean
): Promise<AccessResult> {
  // 1. 模块未配置
  if (!isStorageConfigured()) {
    return { allowed: false, reason: 'not-configured' }
  }

  // 2. 规范化路径
  const normalized = normalizePath(relativePath)
  if (!normalized) {
    return { allowed: false, reason: 'not-found' }
  }

  // 3. 提取顶层文件夹
  const topLevel = getTopLevelFolder(normalized)
  if (!topLevel) {
    // 顶层文件(根目录下)默认私有,需登录
    if (isAuthenticated) return { allowed: true }
    return { allowed: false, reason: 'not-found' }
  }

  // 4. 查询顶层文件夹元数据(失败安全)
  let publicAccess = false
  try {
    publicAccess = await isFolderPublic(topLevel)
  } catch {
    return { allowed: false, reason: 'private' }
  }

  // 5. 决策
  if (publicAccess) return { allowed: true }
  if (isAuthenticated) return { allowed: true }
  return { allowed: false, reason: 'private' }
}

