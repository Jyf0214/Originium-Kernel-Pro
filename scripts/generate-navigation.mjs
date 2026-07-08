#!/usr/bin/env node

/**
 * 构建时生成 data/navigation.json
 *
 * 从 posts/ 目录递归扫描，构建导航树并预渲染为 JSON 文件。
 * 页面组件直接 import JSON，无需运行时 API 调用。
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync as fsReadFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const root = join(import.meta.dirname, '..');
const POSTS_DIR = join(root, 'posts');

/**
 * 递归扫描目录，构建导航树
 * 与 app/api/navigation/route.ts 中的逻辑一致
 */
function buildNavigationTree(dir, relativeBase) {
  if (!existsSync(dir)) return [];

  const nodes = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = join(dir, entry.name);
    const indexFile = join(fullPath, 'index.md');

    if (!existsSync(indexFile)) continue;

    let raw;
    try {
      raw = fsReadFileSync(indexFile, 'utf-8');
    } catch {
      continue;
    }

    let data;
    try {
      ({ data } = matter(raw));
    } catch {
      continue;
    }

    const isPublic = data.public === true;
    if (!isPublic) continue;

    const slug = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    const children = buildNavigationTree(fullPath, slug);

    nodes.push({
      slug,
      title: String(data.title ?? entry.name),
      description: String(data.description ?? ''),
      icon: String(data.icon ?? ''),
      order: typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
      public: true,
      children,
    });
  }

  nodes.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  return nodes;
}

const tree = buildNavigationTree(POSTS_DIR, '');

const dataDir = join(root, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

writeFileSync(
  join(dataDir, 'navigation.json'),
  JSON.stringify(tree, null, 2) + '\n',
);

console.log(`[generate-navigation] 已生成 data/navigation.json（${tree.length} 个顶级节点）`);
