#!/usr/bin/env node
/**
 * 构建时标签聚合脚本
 *
 * 扫描 posts 目录下所有公开文章的 frontmatter tags 字段，
 * 聚合为标签列表及每个标签的文章数量，输出到 data/tags.json。
 *
 * 输出文件: data/tags.json
 * 格式: { tags: [{ name, count }] }
 *
 * 公开判断逻辑（与 src/lib/content.ts 的 filterPublicFiles 一致）：
 *   - 有 index.md 的目录：public !== false 即为公开
 *   - 无 index.md 的目录：默认公开
 *   - hidden: true 的文章不计入
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const POSTS_DIR = path.join(PROJECT_ROOT, 'posts');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tags.json');

const LOG_PREFIX = '[generate-tags]';

/**
 * 读取目录下 index.md 的 frontmatter，提取 public 字段
 * @returns {boolean} 目录是否公开（默认 true）
 */
function readDirPublic(dir) {
  const indexPath = path.join(dir, 'index.md');
  if (!fs.existsSync(indexPath)) return true;

  const raw = fs.readFileSync(indexPath, 'utf-8');
  const { data } = matter(raw);
  return data.public !== false;
}

/**
 * 递归扫描 posts 目录，收集公开文章的标签
 */
function scanForTags(dir) {
  const tags = [];
  if (!fs.existsSync(dir)) return tags;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 子目录：检查该目录的 index.md 是否公开
      const dirPublic = readDirPublic(fullPath);
      if (!dirPublic) continue;

      tags.push(...scanForTags(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data } = matter(raw);

      // 跳过 hidden 文章
      if (data.hidden === true) continue;

      const fileTags = Array.isArray(data.tags) ? data.tags : [];
      tags.push(...fileTags);
    }
  }

  return tags;
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log(`${LOG_PREFIX} posts 目录不存在，跳过标签生成`);
    process.exit(0);
  }

  const allTags = scanForTags(POSTS_DIR);

  // 聚合计数
  const tagMap = new Map();
  for (const tag of allTags) {
    tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
  }

  // 按数量降序，数量相同按名称排序
  const tags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ tags }, null, 2), 'utf-8');

  console.log(`${LOG_PREFIX} 标签索引已生成: ${tags.length} 个标签 -> ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

main();
