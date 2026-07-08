#!/usr/bin/env node

/**
 * 构建包装脚本
 *
 * 用 try/finally 保证 restore-db-routes.mjs 在任何情况下都会执行，
 * 避免 filter-db-routes.mjs 移除的路由目录因构建中断而永久丢失。
 *
 * 流程：filter → next build → restore（finally）
 */

import { execSync } from 'child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 1. 过滤路由（无数据库时移除后台路由，GitHub Pages 时移除动态路由）
run('node scripts/filter-db-routes.mjs');

let exitCode = 0;
try {
  // 2. 执行 Next.js 构建
  run('next build');
} catch {
  exitCode = 1;
} finally {
  // 3. 无论构建成功或失败，始终恢复被移除的路由目录
  try {
    run('node scripts/restore-db-routes.mjs');
  } catch (e) {
    console.error('[build-wrapper] 恢复路由目录失败:', e.message);
    // 恢复失败不应该掩盖构建错误，只记录日志
  }
}

process.exit(exitCode);
