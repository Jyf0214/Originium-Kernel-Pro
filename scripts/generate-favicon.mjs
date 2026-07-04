/**
 * 生成默认 favicon（SVG → ICO + PNG）
 *
 * 设计：嵌套菱形 + 渐变，呼应 "Originium Kernel" 主题
 * 无字母，纯几何图形
 *
 * 缓存策略：计算 SVG 内容 hash，与 .next/.favicon-hash 比对，
 * 相同则跳过 sharp 生成（sharp 是耗时操作）
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
    <linearGradient id="h" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a1a1aa"/>
      <stop offset="100%" stop-color="#71717a"/>
    </linearGradient>
  </defs>
  <!-- 外层圆角菱形 -->
  <rect x="96" y="96" width="320" height="320" rx="48" ry="48"
        transform="rotate(45 256 256)" fill="url(#g)"/>
  <!-- 中层圆角菱形 -->
  <rect x="144" y="144" width="224" height="224" rx="32" ry="32"
        transform="rotate(45 256 256)" fill="none" stroke="url(#h)" stroke-width="12"/>
  <!-- 内层实心菱形 -->
  <rect x="192" y="192" width="128" height="128" rx="16" ry="16"
        transform="rotate(45 256 256)" fill="url(#h)" opacity="0.9"/>
</svg>`;

const outDir = join(process.cwd(), 'public');
await mkdir(outDir, { recursive: true });

// 缓存检查：SVG 内容不变则跳过 sharp 生成
const svgHash = createHash('sha256').update(SVG).digest('hex').slice(0, 16);
const hashCachePath = join(process.cwd(), '.next', '.favicon-hash');
try {
  const cached = await readFile(hashCachePath, 'utf-8');
  if (cached.trim() === svgHash) {
    console.log('[favicon] SVG 未变化，跳过生成');
    process.exit(0);
  }
} catch {
  // 缓存文件不存在，继续生成
}

// 生成多尺寸 PNG
const sizes = [16, 32, 48, 192, 512];
const pngBuffers = await Promise.all(
  sizes.map((s) => sharp(Buffer.from(SVG)).resize(s, s).png().toBuffer()),
);

// 生成 .ico（包含 16/32/48 三种尺寸）
await sharp(pngBuffers[2]) // 48x48 作为主尺寸
  .toFile(join(outDir, 'favicon.ico'));

// 生成 apple-touch-icon（192x192 PNG）
await sharp(pngBuffers[3])
  .png()
  .toFile(join(outDir, 'icon-192.png'));

// 生成 PWA icon（512x512 PNG）
await sharp(pngBuffers[4])
  .png()
  .toFile(join(outDir, 'icon-512.png'));

// 生成 SVG favicon（现代浏览器支持）
await writeFile(join(outDir, 'favicon.svg'), SVG);

console.log('[favicon] 已生成:');
console.log('  favicon.ico   (多尺寸)');
console.log('  favicon.svg   (矢量)');
console.log('  icon-192.png  (Apple Touch)');
console.log('  icon-512.png  (PWA)');

// 写入 hash 缓存
await mkdir(join(process.cwd(), '.next'), { recursive: true }).catch(() => {});
await writeFile(hashCachePath, svgHash, 'utf-8');
