/**
 * Originium Kernel 环境变量验证
 * 延迟验证，只在实际使用时检查
 */

export interface EnvConfig {
  databaseUrl: string | undefined;
  authSecret: string;
  appUrl?: string;
  githubRepo?: string;
  githubToken?: string;
  cronSecret?: string;
}

/**
 * 获取环境变量（不验证，构建时可用）
 */
export function getEnvConfig(): EnvConfig {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  const authSecret = process.env.AUTH_SECRET ?? '';
  const appUrl = process.env.APP_URL;
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const cronSecret = process.env.CRON_SECRET;

  return {
    databaseUrl,
    authSecret,
    appUrl,
    githubRepo,
    githubToken,
    cronSecret,
  };
}

/**
 * 存储相关检测函数已统一到 lib/storage/ 模块:
 * - isWebDavConfigured() → lib/webdav.ts
 * - isB2Configured()     → lib/storage/b2.ts
 * - isStorageConfigured() → lib/storage/storage-provider.ts
 *
 * 此处不再重复定义，避免多处实现不一致。
 */
