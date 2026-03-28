// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

// 密码哈希函数（与登录API一致）
function hashPassword(password) {
  return Buffer.from(password).toString('hex').split('').reverse().join('')
}

async function main() {
  // 检查数据库 URL
  const databaseUrl = 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  
  if (!databaseUrl) {
    console.log('[数据库初始化] 未找到数据库 URL，跳过初始化');
    return;
  }
  
  // 检查是否跳过数据库初始化（环境变量控制）
  if (process.env.SKIP_DB_INIT === 'true') {
    console.log('[数据库初始化] SKIP_DB_INIT=true，跳过初始化');
    return;
  }
  
  // 自动添加 sslmode=require
  let finalUrl = databaseUrl
  if (databaseUrl.startsWith('postgres') && !databaseUrl.includes('sslmode')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    finalUrl = `${databaseUrl}${separator}sslmode=require&ssl=true`
  }
  
  process.env.DATABASE_URL = finalUrl
  
  console.log('[数据库初始化] 开始初始化...')
  
  const { execSync } = require('child_process')
  
  try {
    // 尝试推送 schema，如果失败则跳过
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'pipe',
        env: { ...process.env },
        timeout: 30000
      })
      console.log('[数据库初始化] ✓ Schema 推送成功')
    } catch (dbError) {
      const errorMsg = dbError.message || ''
      if (errorMsg.includes('MaxClientsInSessionMode') || 
          errorMsg.includes('max clients reached') ||
          errorMsg.includes('too many clients') ||
          errorMsg.includes('connection pool')) {
        console.log('[数据库初始化] ⚠️ 数据库连接池已满，跳过初始化')
        return
      }
      console.log('[数据库初始化] ⚠️ 数据库连接失败，跳过初始化:', errorMsg.split('\n')[0])
      return
    }
    
    // 检查 ADMIN_PASSWORD 环境变量
    if (process.env.ADMIN_PASSWORD) {
      console.log('[数据库初始化] 检测到 ADMIN_PASSWORD，正在更新管理员密码...')
      
      try {
        const { PrismaClient } = require('@prisma/client')
        const prisma = new PrismaClient()
        
        const hashedPassword = hashPassword(process.env.ADMIN_PASSWORD)
        
        // 查找所有 admin 和 sudo 用户
        const users = await prisma.originiumKV.findMany({
          where: { key: { startsWith: 'user:uid:' } }
        })
        
        let updatedCount = 0
        
        for (const record of users) {
          if (!record.value) continue
          
          try {
            const user = JSON.parse(record.value)
            
            if (user.role === 'admin' || user.role === 'sudo') {
              user.password = hashedPassword
              await prisma.originiumKV.update({
                where: { key: record.key },
                data: { value: JSON.stringify(user) }
              })
              updatedCount++
              console.log(`[数据库初始化] ✓ 已更新用户: ${user.email || user.username || user.uid}`)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        
        await prisma.$disconnect()
        
        if (updatedCount > 0) {
          console.log(`[数据库初始化] ✓ 已更新 ${updatedCount} 个管理员密码`)
        } else {
          console.log('[数据库初始化] ⚠️ 未找到管理员用户')
        }
      } catch (err) {
        console.log('[数据库初始化] ⚠️ 更新管理员密码失败:', err.message?.split('\n')[0])
      }
    }
    
    console.log('[数据库初始化] ✓ 全部完成')
  } catch (error) {
    console.log('[数据库初始化] ⚠️ 初始化跳过:', error.message?.split('\n')[0])
  }
}

main().catch((error) => {
  console.log('[数据库初始化] ⚠️ 错误跳过')
})
