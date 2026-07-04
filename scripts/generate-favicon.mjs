/**
 * 生成默认 favicon（SVG → ICO + PNG）
 *
 * 设计：简洁几何图形——圆角方形 + 小圆点
 * 扁平化，无渐变，无阴影
 *
 * 缓存策略：计算 SVG 内容 hash，与 .next/.favicon-hash 比对，
 * 相同则跳过 sharp 生成（sharp 是耗时操作）
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#18181b"/>
  <circle cx="256" cy="256" r="80" fill="#fafafa"/>
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
