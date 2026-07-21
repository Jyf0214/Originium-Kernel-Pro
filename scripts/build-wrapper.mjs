#!/usr/bin/env node

/**
 * 构建包装脚本
 *
 * 用 try/finally 保证 restore-db-routes.mjs 在任何情况下都会执行，
 * 避免 filter-db-routes.mjs 移除的路由目录因构建中断而永久丢失。
 *
 * 流程：filter → next build → restore（finally）
 *
 * 重要：路由过滤仅在 GitHub Actions 环境下触发（GITHUB_ACTIONS=true），
 * 本地构建绝不执行路由删除，防止开发环境文件被误删。
 */

import { execSync } from 'child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 仅在 GitHub Actions 环境下过滤路由（本地构建绝不删除路由）
if (process.env.GITHUB_ACTIONS === 'true') {
  run('node scripts/filter-db-routes.mjs');
} else {
  console.log('[build-wrapper] 非 GitHub Actions 环境，跳过路由过滤');
}

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

let exitCode = 0;
try {
  // 静态导出模式：必须使用 webpack（turbopack 的 getAssetPrefix() 在异步脚本中
  // 读取 document.currentScript.src 为 null，导致水合失败，所有交互失效）
  // 服务器部署模式：使用 turbopack，构建速度显著提升
  const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
  const buildCmd = isStaticExport ? 'next build --webpack' : 'next build';
  console.log(`[build-wrapper] 构建模式: ${isStaticExport ? '静态导出 (webpack)' : '服务器部署 (turbopack)'}`);
  run(buildCmd);
} catch {
  exitCode = 1;
} finally {
  // 3. 仅在 GitHub Actions 环境下恢复被移除的路由目录
  if (isGitHubActions) {
    try {
      run('node scripts/restore-db-routes.mjs');
    } catch (e) {
      console.error('[build-wrapper] 恢复路由目录失败:', e.message);
    }
  }
}

process.exit(exitCode);
