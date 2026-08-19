import { NextResponse } from 'next/server';
import { createApiLogger } from '@/lib/api-logger';
import { apiHandler } from '@/lib/api-handler';
import { getTranslate } from '@/i18n/translate';

const logger = createApiLogger('/api/env-status');

/**
 * 环境变量状态检查 API
 * 仅 root（或 sudo 模式）可访问——环境变量存在性信息属于敏感配置
 *
 * 每个变量返回 descriptionKey（i18n 键），由前端 useI18n 解析，
 * 避免在服务端硬编码双语文案。
 */
export const GET = apiHandler('GET', { label: getTranslate('api.envStatus.fetchStatus'), requireRoot: true }, () => {
  logger.info('GET', '获取环境变量状态');

  const envStatus = {
    database: {
      name: getTranslate('api.envStatus.groupDatabase'),
      nameKey: 'env.groups.database.name',
      descriptionKey: 'env.groups.database.desc',
      variables: [
        {
          name: 'DATABASE_URL',
          isSet: !!process.env.DATABASE_URL,
          required: true,
          descriptionKey: 'env.vars.database.DATABASE_URL',
        },
      ],
    },
    auth: {
      name: getTranslate('api.envStatus.groupAuth'),
      nameKey: 'env.groups.auth.name',
      descriptionKey: 'env.groups.auth.desc',
      variables: [
        {
          name: 'AUTH_SECRET',
          isSet: !!process.env.AUTH_SECRET,
          required: true,
          descriptionKey: 'env.vars.auth.AUTH_SECRET',
        },
      ],
    },
    admin: {
      name: getTranslate('api.envStatus.groupAdmin'),
      nameKey: 'env.groups.admin.name',
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
          isSet: !!process.env.ADMIN_PASSWORD,
          required: false,
          descriptionKey: 'env.vars.admin.ADMIN_PASSWORD',
        },
      ],
    },
    app: {
      name: getTranslate('api.envStatus.groupApp'),
      nameKey: 'env.groups.app.name',
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
      name: getTranslate('api.envStatus.groupGithub'),
      nameKey: 'env.groups.github.name',
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
          isSet: !!process.env.GITHUB_TOKEN,
          required: false,
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
      name: getTranslate('api.envStatus.groupGiscus'),
      nameKey: 'env.groups.giscus.name',
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
        ? getTranslate('api.envStatus.groupStorageB2')
        : getTranslate('api.envStatus.groupStorageWebdav'),
      nameKey: 'env.groups.storage.name',
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
                isSet: !!process.env.B2_KEY_ID,
                required: true,
                descriptionKey: 'env.vars.storage.B2_KEY_ID',
              },
              {
                name: 'B2_APP_KEY',
                isSet: !!process.env.B2_APP_KEY,
                required: true,
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
                isSet: !!process.env.WEBDAV_PASS,
                required: false,
                descriptionKey: 'env.vars.storage.WEBDAV_PASS',
              },
            ]),
      ],
    },
    smtp: {
      name: getTranslate('api.envStatus.groupSmtp'),
      nameKey: 'env.groups.smtp.name',
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
          isSet: !!process.env.SMTP_PASS,
          required: false,
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
      name: getTranslate('api.envStatus.groupCron'),
      nameKey: 'env.groups.cron.name',
      descriptionKey: 'env.groups.cron.desc',
      variables: [
        {
          name: 'CRON_SECRET',
          isSet: !!process.env.CRON_SECRET,
          required: false,
          descriptionKey: 'env.vars.cron.CRON_SECRET',
        },
      ],
    },
    system: {
      name: getTranslate('api.envStatus.groupSystem'),
      nameKey: 'env.groups.system.name',
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

  // 计算统计
  const allVars = Object.values(envStatus).flatMap((g) => g.variables);
  const requiredVars = allVars.filter((v) => v.required);
  const optionalVars = allVars.filter((v) => !v.required);
  const setVars = allVars.filter((v) => v.isSet);
  const missingRequired = requiredVars.filter((v) => !v.isSet);

  // 自定义 isReady:DB 组要求至少一个连接变量被设置(AUTH_SECRET 已在 required 中)
  const dbVars = envStatus.database.variables;
  const dbReady = dbVars.some((v) => v.isSet);
  const isReady = missingRequired.length === 0 && dbReady;

  // 如果 DB 组全部未设置,把 DATABASE_URL 加入 missing 列表
  const finalMissingRequired = [...missingRequired.map((v) => v.name)];
  if (!dbReady) {
    finalMissingRequired.push('DATABASE_URL');
  }

  logger.info('GET', '环境变量状态获取成功', { isReady, total: allVars.length, set: setVars.length });
  return NextResponse.json({
    groups: envStatus,
    summary: {
      total: allVars.length,
      set: setVars.length,
      required: requiredVars.length,
      requiredSet: requiredVars.filter((v) => v.isSet).length,
      optional: optionalVars.length,
      optionalSet: optionalVars.filter((v) => v.isSet).length,
      missingRequired: finalMissingRequired,
      isReady,
    },
  }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
});
