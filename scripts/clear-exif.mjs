/**
 * 图片 EXIF 数据清除工具
 *
 * 在构建时或上传前清除图片的 EXIF 元数据（GPS、相机信息等），
 * 保护隐私并减小文件体积。
 *
 * 使用方式：
 *   node scripts/clear-exif.mjs <输入目录> [输出目录]
 *
 * 如果未指定输出目录，则覆盖原文件。
 *
 * 依赖：Node.js 内置 Buffer，无需额外安装。
 * 注意：此脚本仅清除 JPEG 的 EXIF 数据，PNG/WebP 等格式本身不含 EXIF。
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

/**
 * 清除 JPEG 文件的 EXIF 数据
 *
 * JPEG 文件的 EXIF 数据存储在 APP1 段（0xFFE1 标记）中。
 * 此函数通过解析 JPEG 段结构，移除所有非图像数据段，
 * 仅保留 SOI（0xFFD8）和 EOI（0xFFD9）标记以及图像数据段。
 */
function clearJpegExif(buffer) {
  // SOI 标记（文件头）
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer; // 不是 JPEG 文件
  }

  const segments = [Buffer.from([0xff, 0xd8])]; // SOI
  let offset = 2;

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      // 非标记字节，跳到下一个标记
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // EOI 标记（文件尾）
    if (marker === 0xd9) {
      segments.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    // SOF 标记（图像数据开始，0xC0-0xCF，排除 0xC4 DHT 和 0xCC DAC）
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xcc) {
      // 保留从当前位置到文件尾的所有数据（包含图像数据）
      segments.push(buffer.slice(offset));
      break;
    }

    // SOS 标记（图像数据开始）
    if (marker === 0xda) {
      // 保留从当前位置到文件尾的所有数据
      segments.push(buffer.slice(offset));
      break;
    }

    // 其他标记：读取段长度并跳过
    if (offset + 3 < buffer.length) {
      const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3];
      offset += 2 + segmentLength;
    } else {
      break;
    }
  }

  return Buffer.concat(segments);
}

/**
 * 递归扫描目录中的 JPEG 文件
 */
async function scanDir(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await scanDir(fullPath)));
    } else if (/\.(jpe?g)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 命令行入口
const inputDir = process.argv[2];
if (!inputDir) {
  console.error('用法: node scripts/clear-exif.mjs <输入目录> [输出目录]');
  process.exit(1);
}

const outputDir = process.argv[3] ?? inputDir;
const files = await scanDir(inputDir);
let cleared = 0;

for (const filePath of files) {
  try {
    const buffer = await readFile(filePath);
    const cleaned = clearJpegExif(buffer);
    if (cleaned.length < buffer.length) {
      const outPath = filePath.replace(inputDir, outputDir);
      await writeFile(outPath, cleaned);
      cleared++;
      console.log(`✓ ${filePath}（节省 ${buffer.length - cleaned.length} 字节）`);
    }
  } catch (err) {
    console.error(`✗ ${filePath}: ${err.message}`);
  }
}

console.log(`\n完成：共扫描 ${files.length} 个 JPEG 文件，清除 ${cleared} 个文件的 EXIF 数据`);
