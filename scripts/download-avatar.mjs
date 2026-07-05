/**
 * 构建前脚本：管理头像文件
 *
 * 流程：
 * 1. 读取 config.yaml 中的 avatar.url
 * 2. 如果是远程 URL → 下载到 avatar/avatar.jpg
 * 3. 如果是本地路径 → 复制到 avatar/avatar.jpg
 * 4. 如果为空 → 使用 avatar/ 中已有的头像文件
 * 5. 最终将 avatar/avatar.jpg 复制到 public/avatar.jpg 供前端使用
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AVATAR_DIR = resolve(ROOT, 'avatar');
const PUBLIC_DIR = resolve(ROOT, 'public');
const PUBLIC_OUTPUT = resolve(PUBLIC_DIR, 'avatar.jpg');

// 确保 avatar/ 目录存在
if (!existsSync(AVATAR_DIR)) {
  mkdirSync(AVATAR_DIR, { recursive: true });
}

// 读取 config.yaml 中的 avatar.url
const configPath = resolve(ROOT, 'config.yaml');
const configText = readFileSync(configPath, 'utf-8');
const avatarMatch = configText.match(/^avatar:\s*\n\s+url:\s*(.+)$/m);
const url = avatarMatch ? avatarMatch[1].trim() : '';

/**
 * 在 avatar/ 目录中查找已有的头像文件
 */
function findExistingAvatar() {
  if (!existsSync(AVATAR_DIR)) return null;
  const files = readdirSync(AVATAR_DIR);
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const avatarFile = files.find(f => imageExts.includes(extname(f).toLowerCase()));
  return avatarFile ? resolve(AVATAR_DIR, avatarFile) : null;
}

/**
 * 将文件复制到 public/avatar.jpg
 */
function copyToPublic(source) {
  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  copyFileSync(source, PUBLIC_OUTPUT);
  const stat = readFileSync(PUBLIC_OUTPUT);
  console.log(`[avatar] 已复制到 public/avatar.jpg (${stat.length} bytes)`);
}

// === 主流程 ===

if (url) {
  // 远程 URL → 下载
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log(`[avatar] 下载头像: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OriginiumKernel/1.0' },
        redirect: 'follow',
      });
      if (!res.ok) {
        console.error(`[avatar] 下载失败: HTTP ${res.status} ${res.statusText}`);
        // 回退到已有文件
        const existing = findExistingAvatar();
        if (existing) {
          console.log(`[avatar] 回退到已有头像: ${existing}`);
          copyToPublic(existing);
          process.exit(0);
        }
        process.exit(1);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) {
        console.error('[avatar] 下载内容为空');
        process.exit(1);
      }
      writeFileSync(resolve(AVATAR_DIR, 'avatar.jpg'), buffer);
      console.log(`[avatar] 已保存到 avatar/avatar.jpg (${buffer.length} bytes)`);
      copyToPublic(resolve(AVATAR_DIR, 'avatar.jpg'));
    } catch (err) {
      console.error(`[avatar] 下载异常: ${err.message}`);
      const existing = findExistingAvatar();
      if (existing) {
        console.log(`[avatar] 回退到已有头像: ${existing}`);
        copyToPublic(existing);
        process.exit(0);
      }
      process.exit(1);
    }
  } else {
    // 本地路径 → 复制
    const localPath = resolve(ROOT, url);
    if (!existsSync(localPath)) {
      console.error(`[avatar] 本地文件不存在: ${localPath}`);
      const existing = findExistingAvatar();
      if (existing) {
        console.log(`[avatar] 回退到已有头像: ${existing}`);
        copyToPublic(existing);
        process.exit(0);
      }
      process.exit(1);
    }
    console.log(`[avatar] 复制本地头像: ${localPath}`);
    copyFileSync(localPath, resolve(AVATAR_DIR, 'avatar.jpg'));
    copyToPublic(resolve(AVATAR_DIR, 'avatar.jpg'));
  }
} else {
  // 无 URL → 使用 avatar/ 中已有的头像
  const existing = findExistingAvatar();
  if (existing) {
    console.log(`[avatar] 使用已有头像: ${existing}`);
    copyToPublic(existing);
  } else {
    console.error('[avatar] avatar.url 为空且 avatar/ 目录中无头像文件，请配置 avatar.url 或将头像放入 avatar/ 目录');
    process.exit(1);
  }
}
