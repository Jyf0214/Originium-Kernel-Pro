#!/usr/bin/env npx tsx
/**
 * 文章加密工具（维护脚本，非构建流程）
 *
 * 用法：
 *   POST_ENCRYPT_PASSWORD="你的密码" npx tsx scripts/encrypt-posts.mts
 *
 * 行为：
 *   - 扫描 posts/**/*.md，找出 frontmatter 含 password（SHA-256 哈希）的文章
 *   - 校验密码哈希匹配后，用 PBKDF2-SHA256 派生密钥 AES-GCM 加密正文
 *   - 正文替换为密文行 aes_gcm:v2:<salt>:<iv>:<cipher>（frontmatter 原样保留）
 *   - 已加密（正文已是密文）的文件跳过
 *
 * 注意：
 *   - 加密后正文不再以明文存在于仓库与构建产物，站点运行时只下发密文
 *   - 密码仅通过环境变量传入，不落盘、不进 git
 *   - 忘记密码则无法解密（密钥由密码派生，无后门）
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { encryptArticle, ARTICLE_CIPHER_PREFIX } from '../src/lib/article-crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'posts');

const LOG_PREFIX = '[encrypt-posts]';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** 收集全部 .md 文件路径 */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 拆分 frontmatter 与正文，返回 [frontmatter块, 正文]；无 frontmatter 返回 [null, 全文] */
function splitFrontmatter(raw: string): [string | null, string] {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return [null, raw];
  return [match[1], match[2]];
}

/** 从 frontmatter 块提取 password 字段（YAML 标量） */
function extractFrontmatter(block: string | null): Record<string, unknown> {
  if (!block) return {};
  // 只解析需要的最小字段（password），避免完整 YAML 反序列化改动原文件
  const result: Record<string, unknown> = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^password\s*:\s*(.+)$/);
    if (m) {
      let v = m[1].trim().replace(/^['"]|['"]$/g, '');
      // 引号包裹且是纯数字时还原
      if (/^\d+$/.test(v)) v = v;
      result.password = v;
    }
  }
  return result;
}

async function main(): Promise<void> {
  const password = process.env.POST_ENCRYPT_PASSWORD;
  if (!password) {
    console.error(`${LOG_PREFIX} 缺少 POST_ENCRYPT_PASSWORD 环境变量，无法加密`);
    process.exit(1);
  }

  const files = collectMarkdownFiles(POSTS_DIR);
  if (files.length === 0) {
    console.log(`${LOG_PREFIX} posts 目录不存在或无文件，跳过`);
    return;
  }

  let encrypted = 0;
  let skipped = 0;

  for (const fullPath of files) {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const [frontmatter, content] = splitFrontmatter(raw);
    const fm = extractFrontmatter(frontmatter);
    const passwordHash = typeof fm.password === 'string' && fm.password ? fm.password : null;

    if (!passwordHash) continue;
    if (content.trimStart().startsWith(ARTICLE_CIPHER_PREFIX)) {
      console.log(`${LOG_PREFIX} 已加密，跳过: ${path.relative(POSTS_DIR, fullPath)}`);
      skipped++;
      continue;
    }

    if (sha256Hex(password) !== passwordHash) {
      console.error(`${LOG_PREFIX} 密码哈希不匹配: ${path.relative(POSTS_DIR, fullPath)}`);
      process.exit(1);
    }

    const { encryptedContent } = await encryptArticle(content, password);
    // 保留原始 frontmatter 文本，仅替换正文，避免 YAML 重序列化改动无关字段
    const out = frontmatter
      ? `---\n${frontmatter}\n---\n${encryptedContent}\n`
      : encryptedContent;
    fs.writeFileSync(fullPath, out, 'utf-8');
    console.log(`${LOG_PREFIX} 已加密: ${path.relative(POSTS_DIR, fullPath)}`);
    encrypted++;
  }

  console.log(`${LOG_PREFIX} 完成: 加密 ${encrypted} 篇，跳过 ${skipped} 篇`);
}

void main();
