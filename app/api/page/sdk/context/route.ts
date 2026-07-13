/**
 * 自定义页面 SDK — 上下文端点
 * GET /api/page/sdk/context
 *
 * 返回当前用户信息（白名单）和站点公开配置
 * 无需登录即可调用
 */
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getSession } from '@/lib/auth'

export const GET = apiHandler('GET', { label: 'page-sdk.context' }, async (_req) => {
  const session = await getSession()

  // 用户信息白名单（从数据库查询 name）
  let userName: string | null = null
  let isLoggedIn = false
  if (session) {
    isLoggedIn = true
    try {
      const { getDb } = await import('@/lib/db')
      const db = getDb()
      if (db.prisma) {
        const dbUser = await db.prisma.user.findUnique({
          where: { uid: session.uid },
          select: { name: true },
        })
        userName = dbUser?.name ?? null
      }
    } catch {
      // 查询失败使用 null
    }
  }
  const user = { name: userName, isLoggedIn }

  // 站点公开配置白名单（从 config.yaml 加载）
  let config = { title: 'Originium Kernel', description: '' }
  try {
    const { loadConfig } = await import('@/lib/config')
    const fullConfig = await loadConfig()
    config = {
      title: fullConfig.site?.title || config.title,
      description: fullConfig.site?.description || config.description,
    }
  } catch {
    // 配置加载失败使用默认值
  }

  return NextResponse.json({ user, config })
})
