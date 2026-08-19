#!/usr/bin/env node

/**
 * 构建后路由恢复脚本
 *
 * 读取 .disabled-routes/.manifest.json，将路由目录移回原位。
 * 由 package.json 的 postbuild 钩子调用。
 * 即使构建失败也会执行，确保本地开发环境不受影响。
 *
 * 容错设计：manifest 缺失/损坏、单个目录恢复失败都不应中断整体恢复，
 * 失败信息打印到 stderr 供排查；最后仍会尝试清理 .disabled-routes/。
 */

import { existsSync, renameSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DISABLED_DIR = join(ROOT, '.disabled-routes');
const MANIFEST = join(DISABLED_DIR, '.manifest.json');

let manifest = null;
if (existsSync(MANIFEST)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
  } catch (err) {
    console.error(`[restore-db-routes] manifest 读取失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (!manifest) {
  // 没有被禁用的路由（或 manifest 损坏），直接退出
  process.exit(0);
}

console.log('[restore-db-routes] 恢复被禁用的路由目录...');

let failed = 0;
for (const { original, stored } of manifest) {
  const src = join(DISABLED_DIR, stored);
  const dest = join(ROOT, original);

  if (!existsSync(src)) {
    console.error(`  警告: 找不到暂存目录 ${stored}，跳过 ${original}`);
    continue;
  }

  try {
    renameSync(src, dest);
    console.log(`  恢复: ${original}`);
  } catch (err) {
    failed++;
    console.error(`  恢复失败: ${original} — ${err instanceof Error ? err.message : String(err)}`);
  }
}

// 清理 .disabled-routes/（尽力而为，失败不影响主流程）
try {
  rmSync(DISABLED_DIR, { recursive: true, force: true });
} catch (err) {
  console.error(`[restore-db-routes] 清理 .disabled-routes/ 失败: ${err instanceof Error ? err.message : String(err)}`);
}

if (failed > 0) {
  console.error(`[restore-db-routes] 恢复完成，${failed} 个目录恢复失败，请手动检查`);
  process.exit(1);
}
console.log('[restore-db-routes] 恢复完成');