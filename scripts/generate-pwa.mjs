#!/usr/bin/env node

/**
 * 生成 PWA 静态资源（sw.js / manifest.json / offline.html）
 *
 * 源文件位于版本库内的 src/pwa/ 目录，构建期复制到 public/ 下。
 * public/ 整体不纳入版本控制（均为构建产物），
 * PWA 源文件缺失时直接报错，不允许静默跳过。
 */

import { mkdir, copyFile, access } from 'fs/promises';
import { join } from 'path';

const root = process.cwd();
const sourceDir = join(root, 'src', 'pwa');
const targetDir = join(root, 'public');

/** PWA 源文件清单（与 public/ 输出文件名一致） */
const PWA_FILES = ['sw.js', 'manifest.json', 'offline.html'];

async function main() {
  await mkdir(targetDir, { recursive: true });

  for (const file of PWA_FILES) {
    const src = join(sourceDir, file);
    try {
      await access(src);
    } catch {
      throw new Error(`[generate-pwa] PWA 源文件缺失: ${src}`);
    }
    await copyFile(src, join(targetDir, file));
  }

  console.log(`[generate-pwa] 已生成 ${PWA_FILES.length} 个 PWA 文件到 public/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});