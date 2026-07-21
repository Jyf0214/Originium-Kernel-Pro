/**
 * 生成 favicon（源图片 → ICO + SVG + PNG）
 *
 * 读取 config.yaml 中 appearance.favicon 作为源图片路径，
 * 通过 sharp 转换为 favicon.ico / favicon.svg / icon-192.png / icon-512.png。
 * 若未配置或文件不存在，使用内置默认 SVG。
 *
 * 缓存策略：计算源内容 hash，与 .next/.favicon-hash 比对，
 * 相同则跳过 sharp 生成（sharp 是耗时操作）
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile, access } from 'fs/promises';
import { join, extname } from 'path';
import { createHash } from 'crypto';
import yaml from 'js-yaml';

// ============================================================================
// 默认 SVG
// ============================================================================

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#18181b"/>
  <circle cx="256" cy="256" r="80" fill="#fafafa"/>
</svg>`;

// ============================================================================
// 读取 config.yaml → appearance.favicon
// ============================================================================

const root = process.cwd();
const outDir = join(root, 'public');
await mkdir(outDir, { recursive: true });

let sourceBuffer = null;
let sourceType = null; // 'svg' | 'image' | null

try {
  const configPath = join(root, 'config.yaml');
  const configContent = await readFile(configPath, 'utf-8');
  const config = yaml.load(configContent);
  const faviconPath = config?.appearance?.favicon;

  if (faviconPath && typeof faviconPath === 'string' && faviconPath.startsWith('/')) {
    // 去掉开头的 /，解析为 public/ 下的文件
    const relPath = faviconPath.slice(1);
    const absPath = join(outDir, relPath);

    try {
      await access(absPath);
      sourceBuffer = await readFile(absPath);
      const ext = extname(relPath).toLowerCase();
      if (ext === '.svg') {
        sourceType = 'svg';
      } else {
        sourceType = 'image';
      }
      console.log(`[favicon] 使用自定义源图片: ${faviconPath}`);
    } catch {
      console.warn(`[favicon] 自定义源图片不存在: ${faviconPath}，使用默认图标`);
    }
  }
} catch {
  // config.yaml 不存在或解析失败，使用默认
}

// ============================================================================
// 缓存检查：源内容不变则跳过 sharp 生成
// ============================================================================

const hashCachePath = join(root, '.next', '.favicon-hash');
const contentToHash = sourceBuffer ? sourceBuffer : Buffer.from(DEFAULT_SVG);
const contentHash = createHash('sha256').update(contentToHash).digest('hex').slice(0, 16);

try {
  const cached = await readFile(hashCachePath, 'utf-8');
  if (cached.trim() === contentHash) {
    console.log('[favicon] 源图片未变化，跳过生成');
    process.exit(0);
  }
} catch {
  // 缓存文件不存在，继续生成
}

// ============================================================================
// 生成图标文件
// ============================================================================

if (sourceType === 'svg') {
  // SVG 源：用 sharp 从 SVG 生成各格式
  const svgString = sourceBuffer.toString('utf-8');

  const sizes = [16, 32, 48, 192, 512];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(Buffer.from(svgString)).resize(s, s).png().toBuffer()),
  );

  await sharp(pngBuffers[2])
    .toFile(join(outDir, 'favicon.ico'));

  await sharp(pngBuffers[3])
    .png()
    .toFile(join(outDir, 'icon-192.png'));

  await sharp(pngBuffers[4])
    .png()
    .toFile(join(outDir, 'icon-512.png'));

  await writeFile(join(outDir, 'favicon.svg'), svgString);

} else if (sourceType === 'image') {
  // PNG/JPG/WebP/GIF 源图片：用 sharp 转换为所有格式
  const image = sharp(sourceBuffer);
  const metadata = await image.metadata();

  // 生成多尺寸 PNG
  const sizes = [16, 32, 48, 192, 512];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(sourceBuffer).resize(s, s).png().toBuffer()),
  );

  // 生成 .ico（包含 16/32/48 三种尺寸）
  await sharp(pngBuffers[2])
    .toFile(join(outDir, 'favicon.ico'));

  // 生成 apple-touch-icon（192x192 PNG）
  await sharp(pngBuffers[3])
    .png()
    .toFile(join(outDir, 'icon-192.png'));

  // 生成 PWA icon（512x512 PNG）
  await sharp(pngBuffers[4])
    .png()
    .toFile(join(outDir, 'icon-512.png'));

  // 生成 SVG favicon：用源图片的 PNG base64 内联到 SVG
  const pngBase64 = sourceBuffer.toString('base64');
  const fmt = metadata.format || 'png';
  const w = metadata.width || 512;
  const h = metadata.height || 512;
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <image href="data:image/${fmt};base64,${pngBase64}" width="${w}" height="${h}"/>
</svg>`;
  await writeFile(join(outDir, 'favicon.svg'), svgContent);

} else {
  // 使用默认 SVG
  const svgString = DEFAULT_SVG;

  const sizes = [16, 32, 48, 192, 512];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(Buffer.from(svgString)).resize(s, s).png().toBuffer()),
  );

  await sharp(pngBuffers[2])
    .toFile(join(outDir, 'favicon.ico'));

  await sharp(pngBuffers[3])
    .png()
    .toFile(join(outDir, 'icon-192.png'));

  await sharp(pngBuffers[4])
    .png()
    .toFile(join(outDir, 'icon-512.png'));

  await writeFile(join(outDir, 'favicon.svg'), svgString);
}

// ============================================================================
// 输出结果
// ============================================================================

console.log('[favicon] 已生成:');
console.log('  favicon.ico   (多尺寸)');
console.log('  favicon.svg   (矢量)');
console.log('  icon-192.png  (Apple Touch)');
console.log('  icon-512.png  (PWA)');

// 写入 hash 缓存
await mkdir(join(root, '.next'), { recursive: true }).catch(() => {});
await writeFile(hashCachePath, contentHash, 'utf-8');
