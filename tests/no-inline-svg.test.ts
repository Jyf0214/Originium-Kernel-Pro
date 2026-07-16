import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * 内联 SVG 回归检查
 *
 * 目的: 项目已将所有内联 SVG 替换为 lucide-react / simple-icons。
 * 本测试扫描 app/ 与 components/ 下的 .tsx 文件,检测是否仍有
 * 内联 <svg 标签,防止未来代码回退。
 *
 * 排除:
 * - node_modules / .next / dist / .git
 * - 第三方库声明文件（*d.ts）
 * - 测试文件自身
 *
 * 豁免方式:
 * - 单文件豁免: 在文件最顶部加 /* eslint-disable no-inline-svg *\/
 * - 单行豁免:   在含 <svg 的 JSX 行末尾加 // no-inline-svg-ok
 */

const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', '.vercel']);
const SOURCE_EXTS = new Set(['.tsx']);
const FILE_EXEMPT_MARKER = '/* eslint-disable no-inline-svg */';
const LINE_EXEMPT_MARKER = '// no-inline-svg-ok';

/** 递归收集 .tsx 文件 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) results.push(...collectFiles(full));
    } else if (SOURCE_EXTS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/** 检查文件是否被豁免 */
function isFileExempted(content: string): boolean {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    return trimmed === FILE_EXEMPT_MARKER;
  }
  return false;
}

interface SvgViolation {
  file: string;
  line: number;
}

// ── 主测试逻辑 ──

const SCAN_DIRS = ['app', 'components'].map((d) => path.join(ROOT, 'src', d));
const allFiles = SCAN_DIRS.flatMap((dir) => collectFiles(dir));
const violations: SvgViolation[] = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (isFileExempted(content)) continue;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.includes(LINE_EXEMPT_MARKER)) continue;
    // 检测 JSX 中的 <svg 标签（不区分大小写，排除注释行）
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')) continue;
    if (/<svg\b/i.test(line)) {
      violations.push({
        file: path.relative(ROOT, filePath),
        line: i + 1,
      });
    }
  }
}

describe('内联 SVG 回归检查', () => {
  test(`扫描了 ${allFiles.length} 个 .tsx 文件`, () => {
    expect(allFiles.length).toBeGreaterThan(20);
  });

  test('不应存在内联 <svg> 标签（应使用 lucide-react / simple-icons）', () => {
    if (violations.length > 0) {
      const details = violations
        .map((v) => `  ${v.file}:${v.line}`)
        .join('\n');
      expect.fail(
        `发现 ${violations.length} 处内联 SVG:\n\n${details}\n\n` +
        `请使用 lucide-react 或 simple-icons 替代。\n` +
        `豁免方式: 文件顶部加 /* eslint-disable no-inline-svg */ 或行末加 // no-inline-svg-ok`,
      );
    }
  });
});
