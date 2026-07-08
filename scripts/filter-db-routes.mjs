#!/usr/bin/env node

/**
 * 构建时路由过滤脚本
 *
 * 检测数据库环境变量，无数据库时将后台相关路由目录临时移至 .disabled-routes/，
 * 使 next build 不生成这些路由的构建产物。
 *
 * 被移除的路由：
 *   - app/dashboard/          仪表盘
 *   - app/login/              登录
 *   - app/forgot-password/    密码重置
 *   - app/reset-password/     密码修改
 *   - app/diary/              日记
 *   - app/faces/              人物/联系人
 *   - app/editor/             编辑器
 *   - app/clerk/              Clerk 认证
 *   - app/[user]/             用户主页
 *   - app/[user]/[article]    用户文章
 *   - app/article/            文章视图
 *   - app/page/               自定义页面
 *   - app/files/              文件管理
 *   - app/tickets/            工单
 *   - app/api/auth/           认证 API
 *   - app/api/admin/          管理 API
 *   - app/api/diary/          日记 API
 *   - app/api/faces/          人物 API
 *   - app/api/user/           用户信息 API
 *   - app/api/users/          用户列表 API
 *   - app/api/page/           自定义页面 API
 *   - app/api/tickets/        工单 API
 *   - app/api/github/         GitHub 同步 API
 *   - app/api/webhooks/       Webhook API
 *   - app/api/cleanup         清理 API
 *   - app/api/recycle-bin     回收站 API
 *   - app/api/feedback        反馈 API
 *   - app/api/requests        请求 API
 *   - app/api/ticket-templates 工单模板 API
 *
 * 有数据库时直接退出，不做任何操作。
 * 构建完成后由 restore-db-routes.mjs 恢复。
 */

import { existsSync, renameSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const DISABLED_DIR = join(ROOT, '.disabled-routes');
const MANIFEST = join(DISABLED_DIR, '.manifest.json');

/** 需要在无数据库时移除的路由目录（相对于 ROOT） */
const DB_ROUTE_PATHS = [
  // ── 后台管理 ──
  'app/dashboard',
  'app/login',
  'app/forgot-password',
  'app/reset-password',
  // ── 认证依赖（日记、人物、编辑器、Clerk、用户页） ──
  'app/diary',
  'app/faces',
  'app/editor',
  'app/clerk',
  'app/[user]',
  'app/[user]/[article]',
  'app/article',
  // ── 存储 / 自定义页面 / 工单 / 文件管理 ──
  'app/page',
  'app/files',
  'app/tickets',
  // ── API：认证 / 管理 ──
  'app/api/auth',
  'app/api/admin',
  // ── API：认证依赖 ──
  'app/api/diary',
  'app/api/faces',
  'app/api/user',
  'app/api/users',
  'app/api/cleanup',
  'app/api/recycle-bin',
  'app/api/feedback',
  'app/api/requests',
  'app/api/ticket-templates',
  'app/api/tickets',
  'app/api/github',
  'app/api/webhooks',
  // ── API：存储 / 自定义页面 ──
  'app/api/page',
];

function hasDatabase() {
  return !!(
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING
  );
}

if (hasDatabase()) {
  // 有数据库，不操作
  process.exit(0);
}

console.log('[filter-db-routes] 未检测到数据库环境变量，移除后台路由目录...');

if (!existsSync(DISABLED_DIR)) {
  mkdirSync(DISABLED_DIR, { recursive: true });
}

const manifest = [];
let moved = 0;

for (const relPath of DB_ROUTE_PATHS) {
  const src = join(ROOT, relPath);
  if (!existsSync(src)) continue;

  // 平铺存放：.disabled-routes/app__dashboard → app/dashboard
  const flatName = relPath.replace(/\//g, '__');
  const dest = join(DISABLED_DIR, flatName);

  renameSync(src, dest);
  manifest.push({ original: relPath, stored: flatName });
  console.log(`  移除: ${relPath}`);
  moved++;
}

if (moved > 0) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`[filter-db-routes] 共移除 ${moved} 个路由目录`);
} else {
  console.log('[filter-db-routes] 无需移除的路由目录');
}
