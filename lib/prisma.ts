/**
 * Prisma Client 单例
 */

// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

import { PrismaClient } from '@prisma/client'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as any as {
  prisma: PrismaClient | undefined
}

// 获取数据库URL，自动添加SSL参数
function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || ''
  
  // 如果是PostgreSQL且没有sslmode参数，自动添加
  if (url.startsWith('postgres') && !url.includes('sslmode')) {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}sslmode=require`
  }
  
  return url
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
