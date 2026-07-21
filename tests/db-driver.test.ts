/**
 * lib/db.ts 单元测试
 * 覆盖：hasDatabase、PrismaDriver KV 操作、过期逻辑、cleanupExpiredKV 节流、
 *       storage 辅助函数、getDb 单例、PrismaClient SSL 参数处理、无数据库降级
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

/* ---------- PrismaClient Mock ---------- */

const mocks = vi.hoisted(() => ({
  _PrismaClient: vi.fn(),
  _PrismaPg: vi.fn(),
}))

vi.mock('../prisma/generated/prisma/client', () => ({
  PrismaClient: mocks._PrismaClient,
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: mocks._PrismaPg,
}))

function createMockPrisma() {
  return {
    originiumKV: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $disconnect: vi.fn(),
  }
}

/**
 * 重置全局 PrismaClient 缓存 + 模块缓存
 * lib/db.ts 使用 globalThis.prisma 缓存 PrismaClient 单例，
 * vi.resetModules() 不会清除它，必须手动删除以确保下次 import 重新创建
 */
function resetDbModules() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).prisma
  vi.resetModules()
}

/**
 * 辅助函数：重置模块缓存后导入 lib/db，返回关键导出
 * 必须在设置 mockImplementation 之后调用
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importDbWithEnv(envOverrides: Record<string, string | undefined>): Promise<any> {
  Object.assign(process.env, envOverrides)
  resetDbModules()
  const mockPrisma = createMockPrisma()
  // 必须用普通函数（非箭头函数），否则无法用 new 调用
  mocks._PrismaClient.mockImplementation(function () { return mockPrisma })
  const mod = await import('@/lib/db')
  return { ...mod, _mockPrisma: mockPrisma }
}

/* ---------- hasDatabase() ---------- */

describe('hasDatabase()', () => {
  const savedEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...savedEnv }
    resetDbModules()
  })

  test('有 DATABASE_URL 时返回 true', async () => {
    const { hasDatabase } = await importDbWithEnv({ DATABASE_URL: 'postgres://localhost/test' })
    expect(hasDatabase()).toBe(true)
  })

  test('有 POSTGRES_URL 时返回 true', async () => {
    const { hasDatabase } = await importDbWithEnv({
      DATABASE_URL: undefined,
      POSTGRES_URL: 'postgres://localhost/test',
    })
    expect(hasDatabase()).toBe(true)
  })

  test('有 POSTGRES_PRISMA_URL 时返回 true', async () => {
    const { hasDatabase } = await importDbWithEnv({
      DATABASE_URL: undefined,
      POSTGRES_PRISMA_URL: 'postgres://localhost/test',
    })
    expect(hasDatabase()).toBe(true)
  })

  test('有 POSTGRES_URL_NON_POOLING 时返回 true', async () => {
    const { hasDatabase } = await importDbWithEnv({
      DATABASE_URL: undefined,
      POSTGRES_URL_NON_POOLING: 'postgres://localhost/test',
    })
    expect(hasDatabase()).toBe(true)
  })

  test('无任何数据库 URL 时返回 false', async () => {
    const { hasDatabase } = await importDbWithEnv({
      DATABASE_URL: undefined,
      POSTGRES_URL: undefined,
      POSTGRES_PRISMA_URL: undefined,
      POSTGRES_URL_NON_POOLING: undefined,
    })
    expect(hasDatabase()).toBe(false)
  })

  test('DATABASE_URL 优先于 POSTGRES_URL', async () => {
    const { hasDatabase } = await importDbWithEnv({
      DATABASE_URL: 'postgres://primary/test',
      POSTGRES_URL: 'postgres://secondary/test',
    })
    expect(hasDatabase()).toBe(true)
  })
})

/* ---------- PrismaDriver KV 操作 ---------- */

describe('PrismaDriver KV 操作', () => {
  const savedEnv = { ...process.env }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test'
    mockPrisma = createMockPrisma()
    resetDbModules()
    mocks._PrismaClient.mockImplementation(function () { return mockPrisma })
    const mod = await import('@/lib/db')
    db = mod.getDb()
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  /* --- get --- */

  test('get: 记录存在且未过期时返回值', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'test-key',
      value: 'test-value',
      expiry: null,
    })
    const result = await db.get('test-key')
    expect(result).toBe('test-value')
    expect(mockPrisma.originiumKV.findUnique).toHaveBeenCalledWith({ where: { key: 'test-key' } })
  })

  test('get: 记录不存在时返回 null', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    const result = await db.get('missing-key')
    expect(result).toBeNull()
  })

  test('get: 记录已过期时删除并返回 null', async () => {
    const pastExpiry = BigInt(Date.now() - 10000)
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'expired-key',
      value: 'old-value',
      expiry: pastExpiry,
    })
    mockPrisma.originiumKV.delete.mockResolvedValue(undefined)
    const result = await db.get('expired-key')
    expect(result).toBeNull()
    expect(mockPrisma.originiumKV.delete).toHaveBeenCalledWith({ where: { key: 'expired-key' } })
  })

  test('get: 记录存在且有未来过期时间时返回值', async () => {
    const futureExpiry = BigInt(Date.now() + 60000)
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'future-key',
      value: 'future-value',
      expiry: futureExpiry,
    })
    const result = await db.get('future-key')
    expect(result).toBe('future-value')
  })

  /* --- set --- */

  test('set: 无 TTL 时 expiry 为 null', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    await db.set('key1', 'value1')
    expect(mockPrisma.originiumKV.upsert).toHaveBeenCalledWith({
      where: { key: 'key1' },
      update: { value: 'value1', expiry: null },
      create: { key: 'key1', value: 'value1', expiry: null },
    })
  })

  test('set: 有 TTL 时计算正确的过期时间', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    const before = Date.now()
    await db.set('key2', 'value2', 300)
    const call = mockPrisma.originiumKV.upsert.mock.calls[0]![0]
    const expiry = (call as { create: { expiry: bigint } }).create.expiry
    const expiryMs = Number(expiry)
    expect(expiryMs).toBeGreaterThanOrEqual(before + 299 * 1000)
    expect(expiryMs).toBeLessThanOrEqual(before + 301 * 1000)
  })

  test('set: TTL 为 Infinity 时 expiry 为 null', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    await db.set('key3', 'value3', Infinity)
    const call = mockPrisma.originiumKV.upsert.mock.calls[0]![0]
    const expiry = (call as { create: { expiry: bigint | null } }).create.expiry
    expect(expiry).toBeNull()
  })

  test('set: TTL 为 NaN 时 expiry 为 null', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    await db.set('key4', 'value4', NaN)
    const call = mockPrisma.originiumKV.upsert.mock.calls[0]![0]
    const expiry = (call as { create: { expiry: bigint | null } }).create.expiry
    expect(expiry).toBeNull()
  })

  /* --- del --- */

  test('del: 正常删除记录', async () => {
    mockPrisma.originiumKV.delete.mockResolvedValue(undefined)
    await db.del('del-key')
    expect(mockPrisma.originiumKV.delete).toHaveBeenCalledWith({ where: { key: 'del-key' } })
  })

  test('del: 删除失败时不抛出异常', async () => {
    mockPrisma.originiumKV.delete.mockRejectedValue(new Error('delete failed'))
    await expect(db.del('fail-key')).resolves.toBeUndefined()
  })

  /* --- exists --- */

  test('exists: 记录存在且未过期时返回 true', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'exists-key',
      value: 'v',
      expiry: null,
    })
    const result = await db.exists('exists-key')
    expect(result).toBe(true)
  })

  test('exists: 记录不存在时返回 false', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    const result = await db.exists('no-key')
    expect(result).toBe(false)
  })

  test('exists: 记录已过期时返回 false', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'expired',
      value: 'v',
      expiry: BigInt(Date.now() - 10000),
    })
    const result = await db.exists('expired')
    expect(result).toBe(false)
  })

  test('exists: 记录存在且有未来过期时间时返回 true', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'future',
      value: 'v',
      expiry: BigInt(Date.now() + 60000),
    })
    const result = await db.exists('future')
    expect(result).toBe(true)
  })

  /* --- hget --- */

  test('hget: 拼接 key:field 并调用 get', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'hash:field1',
      value: 'hash-value',
      expiry: null,
    })
    const result = await db.hget('hash', 'field1')
    expect(result).toBe('hash-value')
    expect(mockPrisma.originiumKV.findUnique).toHaveBeenCalledWith({ where: { key: 'hash:field1' } })
  })

  test('hget: field 不存在时返回 null', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    const result = await db.hget('hash', 'missing')
    expect(result).toBeNull()
  })

  /* --- hset --- */

  test('hset: 拼接 key:field 并调用 set', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    await db.hset('hash', 'field2', 'new-value')
    expect(mockPrisma.originiumKV.upsert).toHaveBeenCalledWith({
      where: { key: 'hash:field2' },
      update: { value: 'new-value', expiry: null },
      create: { key: 'hash:field2', value: 'new-value', expiry: null },
    })
  })

  /* --- hdel --- */

  test('hdel: 拼接 key:field 并调用 del', async () => {
    mockPrisma.originiumKV.delete.mockResolvedValue(undefined)
    await db.hdel('hash', 'field3')
    expect(mockPrisma.originiumKV.delete).toHaveBeenCalledWith({ where: { key: 'hash:field3' } })
  })

  /* --- hgetall --- */

  test('hgetall: 返回所有未过期的 field', async () => {
    const now = BigInt(Date.now())
    mockPrisma.originiumKV.findMany.mockResolvedValue([
      { key: 'h:a', value: 'val-a', expiry: null },
      { key: 'h:b', value: 'val-b', expiry: now + BigInt(60000) },
      { key: 'h:c', value: 'val-c', expiry: now - BigInt(10000) },
    ])
    const result = await db.hgetall('h')
    expect(result).toEqual({ a: 'val-a', b: 'val-b' })
    expect(mockPrisma.originiumKV.findMany).toHaveBeenCalledWith({
      where: { key: { startsWith: 'h:' } },
    })
  })

  test('hgetall: 无匹配记录时返回空对象', async () => {
    mockPrisma.originiumKV.findMany.mockResolvedValue([])
    const result = await db.hgetall('empty')
    expect(result).toEqual({})
  })
})

/* ---------- PrismaDriver 无数据库行为 ---------- */

describe('PrismaDriver 无数据库环境', () => {
  const savedEnv = { ...process.env }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any

  beforeEach(async () => {
    process.env = {
      ...savedEnv,
      DATABASE_URL: undefined,
      POSTGRES_URL: undefined,
      POSTGRES_PRISMA_URL: undefined,
      POSTGRES_URL_NON_POOLING: undefined,
    }
    resetDbModules()
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    const mod = await import('@/lib/db')
    db = mod.getDb()
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  test('prisma 属性为 null', () => {
    expect(db.prisma).toBeNull()
  })

  test('get 返回 null', async () => {
    expect(await db.get('any')).toBeNull()
  })

  test('set 不抛出异常', async () => {
    await expect(db.set('k', 'v')).resolves.toBeUndefined()
  })

  test('del 不抛出异常', async () => {
    await expect(db.del('k')).resolves.toBeUndefined()
  })

  test('exists 返回 false', async () => {
    expect(await db.exists('k')).toBe(false)
  })

  test('hget 返回 null', async () => {
    expect(await db.hget('h', 'f')).toBeNull()
  })

  test('hset 不抛出异常', async () => {
    await expect(db.hset('h', 'f', 'v')).resolves.toBeUndefined()
  })

  test('hdel 不抛出异常', async () => {
    await expect(db.hdel('h', 'f')).resolves.toBeUndefined()
  })

  test('hgetall 返回空对象', async () => {
    expect(await db.hgetall('h')).toEqual({})
  })
})

/* ---------- cleanupExpiredKV 节流 ---------- */

describe('cleanupExpiredKV 节流', () => {
  const savedEnv = { ...process.env }
  let mockPrisma: ReturnType<typeof createMockPrisma>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test'
    mockPrisma = createMockPrisma()
    resetDbModules()
    mocks._PrismaClient.mockImplementation(function () { return mockPrisma })
    const mod = await import('@/lib/db')
    db = mod.getDb()
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  test('首次 get 触发清理（调用 deleteMany）', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    mockPrisma.originiumKV.deleteMany.mockResolvedValue({ count: 3 })

    await db.get('key')

    expect(mockPrisma.originiumKV.deleteMany).toHaveBeenCalledTimes(1)
  })

  test('1 小时内重复 get 不重复清理', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    mockPrisma.originiumKV.deleteMany.mockResolvedValue({ count: 0 })

    await db.get('key1')
    await db.get('key2')
    await db.get('key3')

    expect(mockPrisma.originiumKV.deleteMany).toHaveBeenCalledTimes(1)
  })

  test('清理失败不抛出异常', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    mockPrisma.originiumKV.deleteMany.mockRejectedValue(new Error('db error'))

    await expect(db.get('key')).resolves.toBeNull()
  })
})

/* ---------- storage 辅助函数 ---------- */

describe('storage 辅助函数', () => {
  const savedEnv = { ...process.env }
  let mockPrisma: ReturnType<typeof createMockPrisma>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage: any

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test'
    mockPrisma = createMockPrisma()
    resetDbModules()
    mocks._PrismaClient.mockImplementation(function () { return mockPrisma })
    const mod = await import('@/lib/db')
    storage = mod.storage
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  test('saveFile: 将内容 base64 编码后存储', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    await storage.saveFile('test/file.txt', 'hello world')

    expect(mockPrisma.originiumKV.upsert).toHaveBeenCalledTimes(1)
    const call = mockPrisma.originiumKV.upsert.mock.calls[0]![0]
    expect((call as { where: { key: string } }).where.key).toBe('file:test/file.txt')
    const storedValue = (call as { create: { value: string } }).create.value
    expect(Buffer.from(storedValue, 'base64').toString('utf-8')).toBe('hello world')
  })

  test('getFile: 读取并 base64 解码', async () => {
    const encoded = Buffer.from('hello world').toString('base64')
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'file:test/file.txt',
      value: encoded,
      expiry: null,
    })

    const result = await storage.getFile('test/file.txt')
    expect(result).toBe('hello world')
  })

  test('getFile: 记录不存在时返回 null', async () => {
    mockPrisma.originiumKV.findUnique.mockResolvedValue(null)
    const result = await storage.getFile('missing/file.txt')
    expect(result).toBeNull()
  })

  test('saveFile/getFile: 中文内容往返编解码', async () => {
    mockPrisma.originiumKV.upsert.mockResolvedValue(undefined)
    const chinese = '你好世界'
    await storage.saveFile('chinese.txt', chinese)

    const encoded = (mockPrisma.originiumKV.upsert.mock.calls[0]![0] as { create: { value: string } }).create.value
    mockPrisma.originiumKV.findUnique.mockResolvedValue({
      key: 'file:chinese.txt',
      value: encoded,
      expiry: null,
    })

    const result = await storage.getFile('chinese.txt')
    expect(result).toBe(chinese)
  })
})

/* ---------- getDb() 单例 ---------- */

describe('getDb() 单例', () => {
  const savedEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  test('多次调用返回同一实例', async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test'
    resetDbModules()
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    const mod = await import('@/lib/db')
    const db1 = mod.getDb()
    const db2 = mod.getDb()
    expect(db1).toBe(db2)
  })
})

/* ---------- PrismaClient URL 处理 ---------- */

describe('PrismaClient URL 处理', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    // 清除 mock 的调用记录，避免上一个测试的 constructorCall 残留
    mocks._PrismaClient.mockClear()
    mocks._PrismaPg.mockClear()
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  test('postgres URL 自动添加 sslmode=no-verify', async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test'
    resetDbModules()
    mocks._PrismaPg.mockImplementation(function (opts: { connectionString: string }) { return { connectionString: opts.connectionString } })
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    await import('@/lib/db')

    const pgCall = mocks._PrismaPg.mock.calls[0]
    const config = pgCall?.[0] as { connectionString: string }
    expect(config?.connectionString).toContain('sslmode=no-verify')
  })

  test('已含 sslmode 的 URL 替换为 no-verify', async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test?sslmode=disable'
    resetDbModules()
    mocks._PrismaPg.mockImplementation(function (opts: { connectionString: string }) { return { connectionString: opts.connectionString } })
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    await import('@/lib/db')

    const pgCall = mocks._PrismaPg.mock.calls[0]
    const config = pgCall?.[0] as { connectionString: string }
    expect(config?.connectionString).toBe('postgres://localhost:5432/test?sslmode=no-verify')
  })

  test('非 postgres URL 不添加 sslmode', async () => {
    process.env.DATABASE_URL = 'mysql://localhost:3306/test'
    resetDbModules()
    mocks._PrismaPg.mockImplementation(function (opts: { connectionString: string }) { return { connectionString: opts.connectionString } })
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    await import('@/lib/db')

    const pgCall = mocks._PrismaPg.mock.calls[0]
    const config = pgCall?.[0] as { connectionString: string }
    expect(config?.connectionString).toBe('mysql://localhost:3306/test')
  })

  test('带查询参数的 postgres URL 用 & 分隔 sslmode', async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/test?connect_timeout=10'
    resetDbModules()
    mocks._PrismaPg.mockImplementation(function (opts: { connectionString: string }) { return { connectionString: opts.connectionString } })
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    await import('@/lib/db')

    const pgCall = mocks._PrismaPg.mock.calls[0]
    const config = pgCall?.[0] as { connectionString: string }
    expect(config?.connectionString).toContain('&sslmode=no-verify')
  })

  test('无数据库 URL 时不创建 adapter', async () => {
    process.env = {
      ...savedEnv,
      DATABASE_URL: undefined,
      POSTGRES_URL: undefined,
      POSTGRES_PRISMA_URL: undefined,
      POSTGRES_URL_NON_POOLING: undefined,
    }
    resetDbModules()
    mocks._PrismaPg.mockImplementation(function (opts: { connectionString: string }) { return { connectionString: opts.connectionString } })
    mocks._PrismaClient.mockImplementation(function () { return createMockPrisma() })
    await import('@/lib/db')

    // 无 URL 时 createPrismaClient 返回 null，不调用 PrismaClient
    expect(mocks._PrismaClient).not.toHaveBeenCalled()
    expect(mocks._PrismaPg).not.toHaveBeenCalled()
  })
})
