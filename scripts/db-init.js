/**
 * 数据库初始化脚本 (Prisma 版本)
 * 使用 Prisma 管理数据库
 */

// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

async function main() {
  console.log('='.repeat(60));
  console.log('[数据库初始化] 开始数据库初始化...');
  console.log('='.repeat(60));
  
  try {
    // 检查是否有 DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.log('[数据库初始化] 未找到 DATABASE_URL，跳过数据库初始化');
      console.log('[数据库初始化] 提示：设置 DATABASE_URL 环境变量以启用数据库功能');
      console.log('='.repeat(60));
      return;
    }
    
    console.log(`[数据库初始化] 检测到数据库 URL: ${databaseUrl.split('://')[0]}://***`);
    
    // 检查数据库类型
    if (databaseUrl.startsWith('redis:')) {
      console.log('[数据库初始化] 使用 Redis，跳过 Prisma 操作');
      console.log('[数据库初始化] Redis 不需要表结构迁移');
      console.log('[数据库初始化] ✓ Redis 初始化完成');
      console.log('='.repeat(60));
      return;
    }
    
    // 使用 Prisma 推送数据库 schema
    console.log('[数据库初始化] 使用 Prisma 推送数据库 schema...');
    
    const { execSync } = require('child_process');
    
    try {
      // 运行 prisma db push
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      console.log('[数据库初始化] ✓ 数据库 schema 推送成功');
    } catch (error) {
      console.log('[数据库初始化] ⚠️ Prisma push 失败，尝试使用 migrate...');
      
      try {
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log('[数据库初始化] ✓ 数据库迁移成功');
      } catch (migrateError) {
        console.error('[数据库初始化] ❌ 数据库迁移失败:', migrateError.message);
        console.log('[数据库初始化] 继续构建，不执行数据库初始化...');
      }
    }
    
    console.log('[数据库初始化] ✓ 数据库初始化完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('[数据库初始化] ❌ 错误:', error.message);
    console.error('[数据库初始化] 堆栈跟踪:', error.stack);
    console.log('[数据库初始化] 继续构建，不执行数据库初始化...');
    console.log('='.repeat(60));
  }
}

main();
