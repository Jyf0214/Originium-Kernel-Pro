// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

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
    
    console.log('[数据库初始化] ✓ 全部完成')
  } catch (error) {
    console.log('[数据库初始化] ⚠️ 初始化跳过:', error.message?.split('\n')[0])
  }
}

main().catch((error) => {
  console.log('[数据库初始化] ⚠️ 错误跳过')
})
