#!/usr/bin/env node

/**
 * 构建后路由恢复脚本
 *
 * 读取 .disabled-routes/.manifest.json，将路由目录移回原位。
 * 由 package.json 的 postbuild 钩子调用。
 * 即使构建失败也会执行，确保本地开发环境不受影响。
 */

import { existsSync, renameSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DISABLED_DIR = join(ROOT, '.disabled-routes');
const MANIFEST = join(DISABLED_DIR, '.manifest.json');

if (!existsSync(MANIFEST)) {
  // 没有被禁用的路由，直接退出
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));

console.log('[restore-db-routes] 恢复被禁用的路由目录...');

for (const { original, stored } of manifest) {
  const src = join(DISABLED_DIR, stored);
  const dest = join(ROOT, original);

  if (existsSync(src)) {
    renameSync(src, dest);
    console.log(`  恢复: ${original}`);
  }
}

// 清理 .disabled-routes/
rmSync(DISABLED_DIR, { recursive: true, force: true });
console.log('[restore-db-routes] 恢复完成');
