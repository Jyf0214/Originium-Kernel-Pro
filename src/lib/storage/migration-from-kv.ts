/**
 * 历史 KV → Prisma StorageFolder 数据迁移工具
 *
 * 背景:
 * - 早期版本的「存储池 / WebDAV」功能曾把文件夹元数据存到 KV
 *   (originium_kv 表,前缀 `storage-folder-meta:`)
 * - 后续已统一迁回 Prisma `StorageFolder` 表(本模块的默认行为)
 * - 截至本工具编写时,KV 形式仅运行了数小时,无实际生产数据,
 *   因此 **默认不调用、不暴露 API**,仅在历史回填/灾难恢复时手动执行
 *
 * 使用方式(手动):
 * ```ts
 * import { migrateStorageFolderMetaFromKv } from '@/lib/storage/migration-from-kv'
 * await migrateStorageFolderMetaFromKv({ dryRun: false })
 * ```
 *
 * 安全:
 * - 默认 `dryRun: true`,只会打印将迁移的条目数,不会写入
 * - 写入时使用 Prisma `upsert`,已存在的记录会被覆盖
 *   (path 是主键,行为等价于「以 KV 数据为准,Prisma 数据后写」)
 * - 不会删除 KV 中的旧数据,留待人工确认后再清理
 */
import { getDb } from '@/lib/db'
import type { StorageFolderMeta } from './types'

/** 与 lib/storage/acl.ts 中历史定义保持一致(供旧 KV 数据反序列化) */
interface StoredFolderMetaJson {
  path: string
  public: boolean
  description: string | null
  createdAt: string
  updatedAt: string
}

/** 历史 KV key 前缀 */
const LEGACY_KV_PREFIX = 'storage-folder-meta:'

export interface MigrationResult {
  scanned: number
  migrated: number
  skipped: number
  errors: number
  dryRun: boolean
}

/**
 * 从 KV 读取并解析历史文件夹元数据。
 *
 * 失败/损坏的记录会被跳过,不影响整体迁移。
 */
async function readLegacyFolderMetas(): Promise<StorageFolderMeta[]> {
  const db = getDb()
  const all = await db.hgetall(LEGACY_KV_PREFIX)
  const result: StorageFolderMeta[] = []
  for (const raw of Object.values(all)) {
    try {
      const p = JSON.parse(raw) as StoredFolderMetaJson
      result.push({
        path: p.path,
        public: p.public,
        description: p.description,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })
    } catch {
      // 跳过损坏数据
    }
  }
  return result
}

/**
 * 执行历史 KV → Prisma 迁移
 *
 * @param options.dryRun  默认 true;设为 false 才真正写入 Prisma
 * @param options.cleanupKv  默认 false;迁移成功后是否同步删除旧 KV 记录
 *                           (生产环境建议先 dryRun,再人工确认后改 false)
 * @returns 扫描/迁移/跳过/错误计数
 *
 * 调用方需自行负责:
 * - 数据库已配置(`getDb().prisma` 不为 null)
 * - 必要时在路由层/管理后台加鉴权
 */
export async function migrateStorageFolderMetaFromKv(
  options: { dryRun?: boolean; cleanupKv?: boolean } = {}
): Promise<MigrationResult> {
  const dryRun = options.dryRun ?? true
  const cleanupKv = options.cleanupKv ?? false
  const prisma = getDb().prisma

  const result: MigrationResult = {
    scanned: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    dryRun,
  }

  if (!prisma) {
    // 数据库未配置,直接返回零计数
    return result
  }

  const legacyMetas = await readLegacyFolderMetas()
  result.scanned = legacyMetas.length

  for (const meta of legacyMetas) {
    if (dryRun) {
      result.migrated += 1
      continue
    }
    try {
      await prisma.storageFolder.upsert({
        where: { path: meta.path },
        create: {
          path: meta.path,
          public: meta.public,
          description: meta.description,
        },
        update: {
          public: meta.public,
          description: meta.description,
          updatedAt: meta.updatedAt,
        },
      })
      if (cleanupKv) {
        await getDb().del(`${LEGACY_KV_PREFIX}${meta.path}`)
      }
      result.migrated += 1
    } catch {
      result.errors += 1
    }
  }

  return result
}
