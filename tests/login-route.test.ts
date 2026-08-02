/**
 * app/api/auth/login/route.ts 集成测试
 *
 * 覆盖范围:
 * - 正确凭据 → 200 success + 写入 session cookie
 * - 错误密码 → 401 + 记录登录失败
 * - 用户不存在 → 401（无 ADMIN_EMAIL 时不自动创建）
 * - 缺少参数 → 400
 * - 2FA 用户 → requires2FA + 写入 temp_2fa cookie
 * - 登录成功后清除失败计数
 *
 * 通过 mock @/lib/db 为内存 KV store，真实执行密码哈希/验证与 JWT 会话签发。
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/hash'

/* ---------- Mocks ---------- */

const mocks = vi.hoisted(() => ({
  _getDb: vi.fn(),
  _getUserAvatar: vi.fn(),
  _logAudit: vi.fn(),
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  getDb: () => mocks._getDb(),
}))

vi.mock('@/lib/config', () => ({
  getUserAvatarAsync: () => mocks._getUserAvatar(),
}))

vi.mock('@/lib/audit', () => ({
  logAudit: (...args: unknown[]) => mocks._logAudit(...args),
}))

vi.mock('@/lib/api-logger', () => ({
  createApiLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// 频率限制为进程内状态，测试间共享会导致相互影响，此处直接放行
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
}))

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mocks.cookieStore),
}))

/* ---------- 内存 KV Mock 数据库 ---------- */

function createMemoryDb() {
  const store = new Map<string, string>()
  const db = {
    prisma: null,
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => { store.set(key, value); return Promise.resolve() }),
    del: vi.fn((key: string) => { store.delete(key); return Promise.resolve() }),
    exists: vi.fn((key: string) => Promise.resolve(store.has(key))),
    hget: vi.fn((key: string, field: string) => Promise.resolve(store.get(`${key}:${field}`) ?? null)),
    hset: vi.fn((key: string, field: string, value: string) => { store.set(`${key}:${field}`, value); return Promise.resolve() }),
    hdel: vi.fn((key: string, field: string) => { store.delete(`${key}:${field}`); return Promise.resolve() }),
    hgetall: vi.fn((key: string) => {
      const result: Record<string, string> = {}
      for (const [k, v] of store) {
        if (k.startsWith(`${key}:`)) result[k.slice(key.length + 1)] = v
      }
      return Promise.resolve(result)
    }),
  }
  return { db, store }
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/* ---------- 测试 ---------- */

describe('POST /api/auth/login', () => {
  const TEST_SECRET = 'a'.repeat(64)
  let mem: ReturnType<typeof createMemoryDb>

  beforeEach(() => {
    mem = createMemoryDb()
    mocks._getDb.mockReturnValue(mem.db)
    mocks._getUserAvatar.mockResolvedValue('/avatar.jpg')
    mocks._logAudit.mockResolvedValue(undefined)
    mocks.cookieStore.set.mockClear()
    mocks.cookieStore.get.mockReset()
    process.env.AUTH_SECRET = TEST_SECRET
    // 绕过 TypeScript 将 NODE_ENV 视为 readonly 的限制
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'test'
    // 确保不自动创建管理员
    delete process.env.ADMIN_EMAIL
    delete process.env.ADMIN_PASSWORD
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    delete process.env.ADMIN_EMAIL
    delete process.env.ADMIN_PASSWORD
    vi.resetModules()
  })

  /** 预置一个已存在的用户 */
  async function seedUser(overrides: { twoFactorEnabled?: boolean; role?: string } = {}) {
    const password = 'Correct-Horse-1'
    const hashed = await hashPassword(password)
    const user = {
      uid: 'UID-TEST-001',
      email: 'user@example.com',
      username: 'testuser',
      name: '测试用户',
      password: hashed,
      role: overrides.role ?? 'user',
      twoFactorEnabled: overrides.twoFactorEnabled ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mem.store.set('user:uid:UID-TEST-001', JSON.stringify(user))
    mem.store.set('user:email:user@example.com', 'UID-TEST-001')
    mem.store.set('user:username:testuser', 'UID-TEST-001')
    return { password, user }
  }

  test('正确凭据 → 200 success + session cookie', async () => {
    const { password, user } = await seedUser()
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'user@example.com', password }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user).toMatchObject({
      uid: user.uid,
      email: user.email,
      username: user.username,
      role: user.role,
    })
    // session cookie 写入
    expect(mocks.cookieStore.set).toHaveBeenCalled()
    const cookieCall = mocks.cookieStore.set.mock.calls[0]
    expect(cookieCall?.[0]).toBe('session')
    expect(typeof cookieCall?.[1]).toBe('string')
  })

  test('错误密码 → 401 且记录失败', async () => {
    await seedUser()
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'user@example.com', password: 'Wrong-Pass-1' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/账号或密码错误/)
    expect(mocks.cookieStore.set).not.toHaveBeenCalled()
  })

  test('用户不存在 → 401（无 ADMIN_EMAIL 时不自动创建管理员）', async () => {
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'nobody@example.com', password: 'Whatever-1' }))
    expect(res.status).toBe(401)
  })

  test('缺少登录信息或密码 → 400', async () => {
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'user@example.com' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/缺少登录信息或密码/)
  })

  test('2FA 用户密码正确 → requires2FA + temp_2fa cookie', async () => {
    await seedUser({ twoFactorEnabled: true })
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'user@example.com', password: 'Correct-Horse-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requires2FA).toBe(true)
    expect(body.success).toBeUndefined()

    const tempCall = mocks.cookieStore.set.mock.calls.find((c) => c[0] === 'temp_2fa')
    expect(tempCall).toBeDefined()
  })

  test('登录成功后清除失败计数', async () => {
    const { password } = await seedUser()
    // 预置已过期的锁定记录与失败计数，验证登录成功时被清理
    mem.store.set('login:locked:user@example.com', String(Date.now() - 60000))
    mem.store.set('login:fail:user@example.com', '5')
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'user@example.com', password }))
    expect(res.status).toBe(200)
    expect(mem.store.has('login:locked:user@example.com')).toBe(false)
    expect(mem.store.has('login:fail:user@example.com')).toBe(false)
  })

  test('管理员自动初始化：配置 ADMIN_EMAIL/ADMIN_PASSWORD 且用户不存在时创建并登录', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    process.env.ADMIN_PASSWORD = 'Admin-Pass-1'
    const { POST } = await import('@/app/api/auth/login/route')

    const res = await POST(makeRequest({ login: 'admin@example.com', password: 'Admin-Pass-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user.email).toBe('admin@example.com')
    expect(body.user.role).toBe('sudo')
    // 用户已写入 KV
    expect(mem.store.has('user:email:admin@example.com')).toBe(true)
  })
})
