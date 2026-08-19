#!/usr/bin/env node
/**
 * 构建时搜索索引生成脚本
 *
 * 在 next build 之前执行，扫描 posts 目录，将公开 Markdown 文章的
 * 元数据与内容摘要预提取到 JSON 索引文件中，供前端搜索直接加载。
 *
 * 输出文件: public/search-index.json（构建产物，public/ 不纳入版本控制）
 *
 * 设计要点:
 *   - 仅收录公开且未隐藏的文章：与 lib/content.ts filterPublicFiles 语义一致
 *     （文件 public !== false、hidden !== true、直接父目录 index.md public !== false），
 *     私有/草稿文章及其正文绝不进入可公开下载的索引
 *   - 内容截取前 5000 字用于全文匹配
 *   - 纯 Node ESM，只依赖项目已有的 gray-matter
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const POSTS_DIR = path.join(PROJECT_ROOT, 'posts');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'search-index.json');

const LOG_PREFIX = '[generate-search-index]';

/** 内容截取上限（字符数），用于运行时全文匹配 */
const CONTENT_SNIPPET_MAX = 5000;

/**
 * 读取目录 index.md 的 public 标记（与 filterPublicFiles 的直接父目录检查一致）
 * 目录无 index.md 时视为公开
 */
function isDirPublic(dir) {
  const indexFile = path.join(dir, 'index.md');
  if (!fs.existsSync(indexFile)) return true;
  try {
    const { data } = matter(fs.readFileSync(indexFile, 'utf-8'));
    return data.public !== false;
  } catch {
    return true;
  }
}

/**
 * 递归扫描目录，收集公开 .md 文件的元数据与内容摘要
 * @param {string} dir 当前扫描目录
 * @param {string} baseDir posts 根目录，用于计算 slug
 * @param {boolean} parentPublic 父目录是否公开（private 目录整棵跳过）
 * @returns {Array<{slug: string, title: string, description: string, tags: string[], content: string}>}
 */
function scanFiles(dir, baseDir, parentPublic) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 目录自身标记为私有（index.md public: false）时整棵跳过
      const dirPublic = parentPublic && isDirPublic(fullPath);
      if (!dirPublic) continue;
      results.push(...scanFiles(fullPath, baseDir, true));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // index.md 是目录索引而非文章，不进入搜索索引
      if (entry.name === 'index.md') continue;

      const relative = path.relative(baseDir, fullPath);
      const slug = '/' + relative.replace(/\.md$/, '').replace(/\\/g, '/');

      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);

      // 权限过滤：private/hidden 文章不入索引（对齐 filterPublicFiles）
      if (data.public === false || data.hidden === true) continue;

      // 加密文章（frontmatter 含 password 字段）：正文为密文，
      // 不入索引（密文无搜索匹配价值，且避免密文随索引外泄），
      // 标题/描述/标签仍可被搜索到（与列表页可见性一致）
      const isEncrypted = typeof data.password === 'string' && data.password !== '';

      results.push({
        slug,
        title: String(data.title ?? ''),
        description: String(data.description ?? ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        content: isEncrypted ? '' : content.slice(0, CONTENT_SNIPPET_MAX),
      });
    }
  }

  return results;
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log(`${LOG_PREFIX} posts 目录不存在，跳过索引生成`);
    process.exit(0);
  }

  const index = scanFiles(POSTS_DIR, POSTS_DIR, true);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');

  const sizeKB = (Buffer.byteLength(JSON.stringify(index), 'utf-8') / 1024).toFixed(1);
  console.log(`${LOG_PREFIX} 搜索索引已生成: ${index.length} 篇文章, ${sizeKB} KB -> ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

main();
