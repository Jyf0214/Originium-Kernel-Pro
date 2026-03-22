// 屏蔽 Prisma 广告
process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'
process.env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'

async function main() {
  // 检查是否有数据库URL（支持多个环境变量）
  const databaseUrl = 
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  
  if (!databaseUrl) {
    console.log('[数据库初始化] 未找到数据库 URL，跳过初始化');
    return;
  }
  
  // 检查数据库类型
  if (databaseUrl.startsWith('redis:')) {
    console.log('[数据库初始化] Redis 无需初始化');
    return;
  }
  
  // SQL 数据库必须初始化成功
  console.log('[数据库初始化] 开始初始化...');
  
  const { execSync } = require('child_process');
  
  try {
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('[数据库初始化] ✓ 成功');
  } catch (error) {
    console.error('[数据库初始化] ❌ 失败:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[数据库初始化] ❌ 错误:', error);
  process.exit(1);
});
