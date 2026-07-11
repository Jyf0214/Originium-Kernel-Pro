import { NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';

const logger = createApiLogger('/api/env-status');

interface EnvVariable {
  name: string;
  isSet?: boolean;
  required: boolean;
  isSecret?: boolean;
  descriptionKey: string;
  systemInjected?: boolean;
}

interface EnvGroup {
  name: string;
  nameKey: string;
  descriptionKey: string;
  variables: EnvVariable[];
}

/**
 * 环境变量状态检查 API
 * 仅管理员可访问
 *
 * 每个变量返回 descriptionKey（i18n 键），由前端 useI18n 解析，
 * 避免在服务端硬编码双语文案。
 *
 * 敏感变量（密钥、密码等）不暴露 isSet 状态，仅展示功能可用性，
 * 避免攻击者推断安全防护级别。
 */
export const GET = apiHandler('GET', { label: '获取环境变量状态', requireAdmin: true }, () => {
  logger.info('GET', '获取环境变量状态');

  const envStatus: Record<string, EnvGroup> = {
    database: {
      name: '数据库',
      nameKey: 'env.groups.database',
      descriptionKey: 'env.groups.database.desc',
      variables: [
        {
          name: 'DATABASE_URL',
          // 数据库连接字符串属于敏感信息，不暴露是否已配置
          required: true,
          isSecret: true,
          descriptionKey: 'env.vars.database.DATABASE_URL',
        },
        {
          name: 'POSTGRES_URL',
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.database.POSTGRES_URL',
        },
        {
          name: 'POSTGRES_PRISMA_URL',
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.database.POSTGRES_PRISMA_URL',
        },
        {
          name: 'POSTGRES_URL_NON_POOLING',
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.database.POSTGRES_URL_NON_POOLING',
        },
      ],
    },
    auth: {
      name: '认证',
      nameKey: 'env.groups.auth',
      descriptionKey: 'env.groups.auth.desc',
      variables: [
        {
          name: 'AUTH_SECRET',
          // 认证密钥属于敏感信息，不暴露是否已配置
          required: true,
          isSecret: true,
          descriptionKey: 'env.vars.auth.AUTH_SECRET',
        },
      ],
    },
    admin: {
      name: '管理员账户',
      nameKey: 'env.groups.admin',
      descriptionKey: 'env.groups.admin.desc',
      variables: [
        {
          name: 'ADMIN_EMAIL',
          isSet: !!process.env.ADMIN_EMAIL,
          required: false,
          descriptionKey: 'env.vars.admin.ADMIN_EMAIL',
        },
        {
          name: 'ADMIN_PASSWORD',
          // 管理员密码属于敏感信息，不暴露是否已配置
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.admin.ADMIN_PASSWORD',
        },
      ],
    },
    app: {
      name: '应用 URL',
      nameKey: 'env.groups.app',
      descriptionKey: 'env.groups.app.desc',
      variables: [
        {
          name: 'APP_URL',
          isSet: !!process.env.APP_URL,
          required: false,
          descriptionKey: 'env.vars.app.APP_URL',
        },
      ],
    },
    github: {
      name: 'GitHub 同步',
      nameKey: 'env.groups.github',
      descriptionKey: 'env.groups.github.desc',
      variables: [
        {
          name: 'GITHUB_REPO',
          isSet: !!process.env.GITHUB_REPO,
          required: false,
          descriptionKey: 'env.vars.github.GITHUB_REPO',
        },
        {
          name: 'GITHUB_TOKEN',
          // GitHub 令牌属于敏感信息，不暴露是否已配置
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.github.GITHUB_TOKEN',
        },
        {
          name: 'NEXT_PUBLIC_GITHUB_REPO',
          isSet: !!process.env.NEXT_PUBLIC_GITHUB_REPO,
          required: false,
          descriptionKey: 'env.vars.github.NEXT_PUBLIC_GITHUB_REPO',
        },
      ],
    },
    giscus: {
      name: 'Giscus 评论',
      nameKey: 'env.groups.giscus',
      descriptionKey: 'env.groups.giscus.desc',
      variables: [
        {
          name: 'NEXT_PUBLIC_GISCUS_REPO',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_REPO,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_REPO',
        },
        {
          name: 'NEXT_PUBLIC_GISCUS_REPO_ID',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_REPO_ID',
        },
        {
          name: 'NEXT_PUBLIC_GISCUS_CATEGORY',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_CATEGORY',
        },
        {
          name: 'NEXT_PUBLIC_GISCUS_CATEGORY_ID',
          isSet: !!process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
          required: false,
          descriptionKey: 'env.vars.giscus.NEXT_PUBLIC_GISCUS_CATEGORY_ID',
        },
      ],
    },
    storage: {
      name: process.env.STORAGE_TYPE?.toLowerCase() === 'backblaze'
        ? '存储池 (Backblaze B2)'
        : '存储池 (WebDAV)',
      nameKey: 'env.groups.storage',
      descriptionKey: 'env.groups.storage.desc',
      variables: [
        {
          name: 'STORAGE_TYPE',
          isSet: !!process.env.STORAGE_TYPE,
          required: false,
          descriptionKey: 'env.vars.storage.STORAGE_TYPE',
        },
        ...(process.env.STORAGE_TYPE?.toLowerCase() === 'backblaze'
          ? [
              {
                name: 'B2_KEY_ID',
                // B2 密钥属于敏感信息，不暴露是否已配置
                required: true,
                isSecret: true,
                descriptionKey: 'env.vars.storage.B2_KEY_ID',
              },
              {
                name: 'B2_APP_KEY',
                // B2 应用密钥属于敏感信息，不暴露是否已配置
                required: true,
                isSecret: true,
                descriptionKey: 'env.vars.storage.B2_APP_KEY',
              },
              {
                name: 'B2_BUCKET',
                isSet: !!process.env.B2_BUCKET,
                required: true,
                descriptionKey: 'env.vars.storage.B2_BUCKET',
              },
              {
                name: 'B2_DOWNLOAD_URL',
                isSet: !!process.env.B2_DOWNLOAD_URL,
                required: false,
                descriptionKey: 'env.vars.storage.B2_DOWNLOAD_URL',
              },
              {
                name: 'B2_S3_ENDPOINT',
                isSet: !!process.env.B2_S3_ENDPOINT,
                required: false,
                descriptionKey: 'env.vars.storage.B2_S3_ENDPOINT',
              },
            ]
          : [
              {
                name: 'WEBDAV_URL',
                isSet: !!process.env.WEBDAV_URL,
                required: false,
                descriptionKey: 'env.vars.storage.WEBDAV_URL',
              },
              {
                name: 'WEBDAV_USER',
                isSet: !!process.env.WEBDAV_USER,
                required: false,
                descriptionKey: 'env.vars.storage.WEBDAV_USER',
              },
              {
                name: 'WEBDAV_PASS',
                // WebDAV 密码属于敏感信息，不暴露是否已配置
                required: false,
                isSecret: true,
                descriptionKey: 'env.vars.storage.WEBDAV_PASS',
              },
            ]),
      ],
    },
    smtp: {
      name: 'SMTP 邮件服务',
      nameKey: 'env.groups.smtp',
      descriptionKey: 'env.groups.smtp.desc',
      variables: [
        {
          name: 'SMTP_HOST',
          isSet: !!process.env.SMTP_HOST,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_HOST',
        },
        {
          name: 'SMTP_PORT',
          isSet: !!process.env.SMTP_PORT,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_PORT',
        },
        {
          name: 'SMTP_USER',
          isSet: !!process.env.SMTP_USER,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_USER',
        },
        {
          name: 'SMTP_PASS',
          // SMTP 密码属于敏感信息，不暴露是否已配置
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.smtp.SMTP_PASS',
        },
        {
          name: 'SMTP_FROM',
          isSet: !!process.env.SMTP_FROM,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_FROM',
        },
        {
          name: 'SMTP_SECURE',
          isSet: !!process.env.SMTP_SECURE,
          required: false,
          descriptionKey: 'env.vars.smtp.SMTP_SECURE',
        },
      ],
    },
    cron: {
      name: '定时任务',
      nameKey: 'env.groups.cron',
      descriptionKey: 'env.groups.cron.desc',
      variables: [
        {
          name: 'CRON_SECRET',
          // 定时任务密钥属于敏感信息，不暴露是否已配置
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.cron.CRON_SECRET',
        },
      ],
    },
    clerk: {
      name: 'Clerk 第三方登录',
      nameKey: 'env.groups.clerk',
      descriptionKey: 'env.groups.clerk.desc',
      variables: [
        {
          name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
          isSet: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          required: false,
          descriptionKey: 'env.vars.clerk.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        },
        {
          name: 'CLERK_SECRET_KEY',
          // Clerk 密钥属于敏感信息，不暴露是否已配置
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.clerk.CLERK_SECRET_KEY',
        },
        {
          name: 'CLERK_WEBHOOK_SECRET',
          // Clerk Webhook 密钥属于敏感信息，不暴露是否已配置
          required: false,
          isSecret: true,
          descriptionKey: 'env.vars.clerk.CLERK_WEBHOOK_SECRET',
        },
      ],
    },
    system: {
      name: '系统 / 构建',
      nameKey: 'env.groups.system',
      descriptionKey: 'env.groups.system.desc',
      variables: [
        {
          name: 'SKIP_DB_INIT',
          isSet: !!process.env.SKIP_DB_INIT,
          required: false,
          descriptionKey: 'env.vars.system.SKIP_DB_INIT',
        },
        {
          name: 'DISABLE_HMR',
          isSet: !!process.env.DISABLE_HMR,
          required: false,
          descriptionKey: 'env.vars.system.DISABLE_HMR',
        },
        {
          name: 'NODE_ENV',
          isSet: !!process.env.NODE_ENV,
          required: false,
          descriptionKey: 'env.vars.system.NODE_ENV',
          systemInjected: true,
        },
        {
          name: 'VERCEL',
          isSet: !!process.env.VERCEL,
          required: false,
          descriptionKey: 'env.vars.system.VERCEL',
          systemInjected: true,
        },
        {
          name: 'VERCEL_URL',
          isSet: !!process.env.VERCEL_URL,
          required: false,
          descriptionKey: 'env.vars.system.VERCEL_URL',
          systemInjected: true,
        },
        {
          name: 'VERCEL_PROJECT_PRODUCTION_URL',
          isSet: !!process.env.VERCEL_PROJECT_PRODUCTION_URL,
          required: false,
          descriptionKey: 'env.vars.system.VERCEL_PROJECT_PRODUCTION_URL',
          systemInjected: true,
        },
      ],
    },
  };

  // 计算统计（敏感变量不暴露 isSet 状态，从统计中排除）
  const allVars = Object.values(envStatus).flatMap((g) => g.variables);
  // 非敏感变量（可安全暴露 isSet 状态）
  const nonSecretVars = allVars.filter((v) => !v.isSecret);
  const requiredVars = allVars.filter((v) => v.required);
  const optionalVars = allVars.filter((v) => !v.required);
  // 仅统计非敏感变量的已配置数量，避免泄露敏感变量是否已配置
  const setVars = nonSecretVars.filter((v) => v.isSet);
  const missingRequired = requiredVars.filter((v) => !v.isSet && !v.isSecret);

  // 自定义 isReady:DB 组要求至少一个连接变量被设置(AUTH_SECRET 已在 required 中)
  const dbVars = envStatus.database!.variables;
  // 通过 process.env 直接判断数据库是否已配置（不暴露具体变量状态）
  const dbConfigured = dbVars.some((v) => !!process.env[v.name]);
  const isReady = missingRequired.length === 0 && dbConfigured;

  // 如果 DB 组全部未设置,把 DATABASE_URL 加入 missing 列表
  const finalMissingRequired = [...missingRequired.map((v) => v.name)];
  if (!dbConfigured) {
    finalMissingRequired.push('DATABASE_URL');
  }

  logger.info('GET', '环境变量状态获取成功', { isReady, total: allVars.length, set: setVars.length });
  return NextResponse.json({
    groups: envStatus,
    summary: {
      total: allVars.length,
      // 仅统计非敏感变量的已配置数量，避免泄露敏感变量是否已配置
      set: setVars.length,
      required: requiredVars.length,
      requiredSet: requiredVars.filter((v) => v.isSet && !v.isSecret).length,
      optional: optionalVars.length,
      optionalSet: optionalVars.filter((v) => v.isSet && !v.isSecret).length,
      missingRequired: finalMissingRequired,
      isReady,
      // 数据库是否已配置（不暴露具体变量状态）
      dbConfigured,
    },
  });
});
