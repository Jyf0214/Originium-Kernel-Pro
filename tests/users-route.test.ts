/**
 * app/api/users/route.ts 单元测试
 * 覆盖：getUserByUsernameSearch、GET handler（按用户名查、按 UID 查、
 *       列出全部用户、权限校验、用户不存在、prisma 查询失败降级 KV）
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

/* ---------- Mocks ---------- */

const mocks = vi.hoisted(() => ({
  _getSession: vi.fn<() => Promise<unknown>>(),
  _getDb: vi.fn(),
  _createApiLogger: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: () => mocks._getSession(),
}))

vi.mock('@/lib/db', () => ({
  getDb: () => mocks._getDb(),
}))

vi.mock('@/lib/api-logger', () => ({
  createApiLogger: (_endpoint: string) => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/**
 * mock apiHandler：直接透传内部 handler，跳过权限校验/日志/指标等包装逻辑
 * 这样可以专注测试 users/route.ts 的业务逻辑
 */
vi.mock('@/lib/api-handler', () => ({
  apiHandler: (
    _method: string,
    _options: unknown,
    handler: (req: unknown, ctx: unknown, session: unknown) => unknown,
  ) => {
    return async (req: unknown, ctx?: unknown) => {
      const session = await mocks._getSession()
      try {
        return await handler(req, ctx, session)
      } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
      }
    }
  },
}))

/* ---------- Mock DB 工厂 ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockDb = any

interface MockDbHandle {
  db: MockDb
  store: Map<string, string>
  getCallKeys: string[]
}

function createMockDb(): MockDbHandle {
  const store = new Map<string, string>()
  const getCallKeys: string[] = []

  const db: MockDb = {
    prisma: null,
    get(key: string): Promise<string | null> {
      getCallKeys.push(key)
      return Promise.resolve(store.get(key) ?? null)
    },
    set(): Promise<void> { return Promise.resolve() },
    del(): Promise<void> { return Promise.resolve() },
    exists(): Promise<boolean> { return Promise.resolve(false) },
    hget(): Promise<string | null> { return Promise.resolve(null) },
    hset(): Promise<void> { return Promise.resolve() },
    hdel(): Promise<void> { return Promise.resolve() },
    hgetall(): Promise<Record<string, string>> { return Promise.resolve({}) },
  }

  return { db, store, getCallKeys }
}

function createMockDbWithPrisma(
  prismaOverride: MockDb,
): MockDbHandle {
  const handle = createMockDb()
  handle.db.prisma = prismaOverride
  return handle
}

/** 模拟 NextRequest，只保留 apiHandler 用到的属性 */
function makeMockReq(url: string) {
  const parsed = new URL(url)
  return {
    url,
    method: 'GET',
    nextUrl: parsed,
    searchParams: parsed.searchParams,
  }
}

/* ---------- getUserByUsernameSearch ---------- */

describe('getUserByUsernameSearch', () => {
  test('命中：通过反向索引 2 次 get 返回用户', async () => {
    const { getUserByUsernameSearch } = await import('@/app/api/users/route')
    const mock = createMockDb()
    const userRecord = {
      uid: 'uid-1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      role: 'admin',
      userGroup: 'default',
    }
    mock.store.set('user:username:alice', 'uid-1')
    mock.store.set('user:uid:uid-1', JSON.stringify(userRecord))

    const result = await getUserByUsernameSearch(mock.db, 'alice')

    expect(result).toEqual({
      uid: 'uid-1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      role: 'admin',
      userGroup: 'default',
    })
    expect(mock.getCallKeys).toEqual(['user:username:alice', 'user:uid:uid-1'])
  })

  test('未命中：反向索引不存在返回 null', async () => {
    const { getUserByUsernameSearch } = await import('@/app/api/users/route')
    const mock = createMockDb()
    const result = await getUserByUsernameSearch(mock.db, 'ghost')
    expect(result).toBeNull()
    expect(mock.getCallKeys).toEqual(['user:username:ghost'])
  })

  test('反向索引存在但主记录 JSON 格式错误返回 null', async () => {
    const { getUserByUsernameSearch } = await import('@/app/api/users/route')
    const mock = createMockDb()
    mock.store.set('user:username:bad', 'uid-bad')
    mock.store.set('user:uid:uid-bad', 'not-json{{{')

    const result = await getUserByUsernameSearch(mock.db, 'bad')
    expect(result).toBeNull()
  })
})

/* ---------- GET handler ---------- */

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('按 username 查询：返回用户数据', async () => {
    const mock = createMockDb()
    const userRecord = {
      uid: 'uid-1',
      name: 'Bob',
      email: 'bob@example.com',
      createdAt: '2024-06-01',
      role: 'user',
      userGroup: 'default',
    }
    mock.store.set('user:username:bob', 'uid-1')
    mock.store.set('user:uid:uid-1', JSON.stringify(userRecord))
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?username=bob')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe('Bob')
    expect(body.email).toBe('bob@example.com')
  })

  test('按 uid 查询：返回用户数据', async () => {
    const mock = createMockDb()
    const userRecord = {
      uid: 'uid-42',
      name: 'Charlie',
      email: 'charlie@example.com',
      createdAt: '2024-07-01',
      role: 'admin',
      userGroup: 'staff',
    }
    mock.store.set('user:uid:uid-42', JSON.stringify(userRecord))
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?uid=uid-42')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.uid).toBe('uid-42')
    expect(body.name).toBe('Charlie')
  })

  test('按 username 查询用户不存在时返回 404', async () => {
    const mock = createMockDb()
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?username=nobody')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('用户不存在')
  })

  test('按 uid 查询用户不存在时返回 404', async () => {
    const mock = createMockDb()
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?uid=uid-missing')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('用户不存在')
  })

  test('普通用户查别人用户名被拒：返回 403', async () => {
    const mock = createMockDb()
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'user-1', role: 'user' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?username=bob')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('无权限')
  })

  test('普通用户查别人 UID 被拒：返回 403', async () => {
    const mock = createMockDb()
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'user-1', role: 'user' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?uid=uid-other')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('无权限')
  })

  test('admin 可以查询用户信息', async () => {
    const mock = createMockDb()
    const userRecord = {
      uid: 'uid-x',
      name: 'Dave',
      email: 'dave@example.com',
      createdAt: '2024-08-01',
      role: 'user',
      userGroup: 'default',
    }
    mock.store.set('user:username:dave', 'uid-x')
    mock.store.set('user:uid:uid-x', JSON.stringify(userRecord))
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'admin' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users?username=dave')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)

    expect(res.status).toBe(200)
  })

  test('列出全部用户：sudo 权限 + prisma 查询', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          { uid: 'u1', name: 'A', email: 'a@x.com', createdAt: '2024-01-01', role: 'user', status: 'active', userGroup: 'g1' },
          { uid: 'u2', name: 'B', email: 'b@x.com', createdAt: '2024-02-01', role: 'admin', status: 'active', userGroup: 'g2' },
        ]),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0].uid).toBe('u1')
    expect(body[1].name).toBe('B')
    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1)
  })

  test('列出全部用户：prisma 失败降级到 KV', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockRejectedValue(new Error('prisma error')),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mock.store.set('users:all:list', JSON.stringify(['uid-kv-1']))
    mock.store.set('user:uid:uid-kv-1', JSON.stringify({
      uid: 'uid-kv-1',
      name: 'KVUser',
      email: 'kv@example.com',
      createdAt: '2024-03-01',
      role: 'user',
      status: 'active',
      userGroup: 'default',
    }))
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('KVUser')
  })

  test('列出全部用户：KV 中无用户列表返回空数组', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockRejectedValue(new Error('prisma down')),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  test('列出全部用户：KV 列表 JSON 格式错误返回空数组', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockRejectedValue(new Error('prisma down')),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mock.store.set('users:all:list', 'not-json')
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  test('列出全部用户：KV 列表非数组返回空数组', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockRejectedValue(new Error('prisma down')),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mock.store.set('users:all:list', JSON.stringify({ not: 'array' }))
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  test('列出全部用户：KV 中个别用户记录损坏时跳过', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockRejectedValue(new Error('prisma down')),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mock.store.set('users:all:list', JSON.stringify(['uid-good', 'uid-bad']))
    mock.store.set('user:uid:uid-good', JSON.stringify({
      uid: 'uid-good',
      name: 'Good',
      email: 'good@example.com',
      createdAt: '2024-01-01',
      role: 'user',
      status: 'active',
      userGroup: 'default',
    }))
    mock.store.set('user:uid:uid-bad', 'broken-json{{{')
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].uid).toBe('uid-good')
  })

  test('列出全部用户：KV 中个别用户记录缺失时跳过', async () => {
    const mockPrisma = {
      user: {
        findMany: vi.fn().mockRejectedValue(new Error('prisma down')),
      },
    }
    const mock = createMockDbWithPrisma(mockPrisma)
    mock.store.set('users:all:list', JSON.stringify(['uid-present', 'uid-absent']))
    mock.store.set('user:uid:uid-present', JSON.stringify({
      uid: 'uid-present',
      name: 'Present',
      email: 'p@x.com',
      createdAt: '2024-01-01',
      role: 'user',
      status: 'active',
      userGroup: 'default',
    }))
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'admin-1', role: 'sudo' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].uid).toBe('uid-present')
  })

  test('普通用户无 username/uid 参数时列全部用户被拒：返回 403', async () => {
    const mock = createMockDb()
    mocks._getDb.mockReturnValue(mock.db)
    mocks._getSession.mockResolvedValue({ uid: 'user-1', role: 'user' })

    const { GET } = await import('@/app/api/users/route')
    const req = makeMockReq('http://localhost/api/users')
    const res = await (GET as (req: unknown) => Promise<Response>)(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('无权限')
  })
})
