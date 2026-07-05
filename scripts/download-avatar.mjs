/**
 * 构建前脚本：从 config.yaml 中读取 avatar.url，下载头像到 public/avatar.jpg
 * 运行时所有代码只引用 /avatar.jpg，不依赖外部 URL
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const OUTPUT = resolve(PUBLIC_DIR, 'avatar.jpg');

// 读取 config.yaml 中的 avatar.url（简易解析，不依赖第三方库）
const configPath = resolve(ROOT, 'config.yaml');
const configText = readFileSync(configPath, 'utf-8');

// 匹配 avatar: 下的 url: 字段
const avatarMatch = configText.match(/^avatar:\s*\n\s+url:\s*(.+)$/m);
if (!avatarMatch) {
  console.error('[download-avatar] config.yaml 中未找到 avatar.url，跳过');
  process.exit(0);
}

const url = avatarMatch[1].trim();
if (!url || !url.startsWith('http')) {
  console.error(`[download-avatar] avatar.url 无效: "${url}"，跳过`);
  process.exit(0);
}

console.log(`[download-avatar] 下载头像: ${url}`);

try {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OriginiumKernel/1.0' },
    redirect: 'follow',
  });

  if (!res.ok) {
    console.error(`[download-avatar] 下载失败: HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length === 0) {
    console.error('[download-avatar] 下载内容为空');
    process.exit(1);
  }

  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT, buffer);
  console.log(`[download-avatar] 已保存到 public/avatar.jpg (${buffer.length} bytes)`);
} catch (err) {
  console.error(`[download-avatar] 下载异常: ${err.message}`);
  process.exit(1);
}
