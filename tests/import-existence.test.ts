import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

/**
 * 导入存在性检查测试
 *
 * 扫描代码中所有 import 语句，检查：
 * 1. 被导入的文件是否存在（路径拼写错误检测）
 * 2. 被导入的具名导出是否确实存在于目标文件中（导出遗漏检测）
 *
 * 排除：
 * - node_modules 包导入（第三方库）
 * - 类型-only 导入（import type）
 * - 路径别名 @/* 的内部路径（由 TypeScript 编译器保证）
 */

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', '.vercel', 'data']);
const SOURCE_EXTS = ['.ts', '.tsx'];

/** 递归收集源文件 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) results.push(...collectFiles(full));
    } else if (SOURCE_EXTS.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 解析 import 语句，返回 { names, source }
 *
 * 支持的格式：
 * - import { A, B } from './foo'
 * - import { A as B } from './foo'
 * - import X from './foo'
 * - import * as X from './foo'
 * - import './foo'（副作用导入）
 */
interface ImportInfo {
  names: string[];   // 具名导入列表（default 用 'default' 表示）
  source: string;    // 导入来源
  line: number;      // 行号
  isTypeOnly: boolean;
}

function parseImports(filePath: string): ImportInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const imports: ImportInfo[] = [];

  // 匹配 import 语句（支持多行）
  // 模式: import [type] { names } from 'source'  或  import [type] X from 'source'
  const importRegex = /^import\s+(type\s+)?(?:\{([^}]*)\}\s+from|(\*\s+as\s+\w+|\w+)\s+from)\s+['"]([^'"]+)['"]/;
  // 副作用导入: import 'source'
  const sideEffectRegex = /^import\s+['"]([^'"]+)['"]/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // 跳过 type-only 导入
    if (trimmed.startsWith('import type ')) continue;

    const importMatch = trimmed.match(importRegex);
    if (importMatch) {
      const isTypeOnly = !!importMatch[1];
      if (isTypeOnly) continue; // import type 不需要检查运行时存在性

      const namesStr = importMatch[2]; // { A, B } 部分
      const defaultOrNs = importMatch[3]; // X 或 * as X
      const source = importMatch[4] ?? '';

      let names: string[];
      if (namesStr) {
        // 具名导入：{ A, B as C } → ['A', 'B']
        names = namesStr.split(',').map((s) => {
          let name = s.trim();
          // 剥离内联 type 关键字：type X → X
          name = name.replace(/^type\s+/, '');
          // 剥离 as 别名：X as Y → X
          const parts = name.split(/\s+as\s+/);
          return (parts[0] ?? '').trim();
        }).filter(Boolean);
      } else if (defaultOrNs) {
        // import X from '...' → ['default']；import * as X from '...' → 跳过
        if (defaultOrNs.includes('*')) continue;
        names = ['default'];
      } else {
        continue;
      }

      imports.push({ names, source, line: i + 1, isTypeOnly: false });
      continue;
    }

    const sideEffectMatch = trimmed.match(sideEffectRegex);
    if (sideEffectMatch) {
      imports.push({ names: [], source: sideEffectMatch[1] ?? '', line: i + 1, isTypeOnly: false });
    }
  }

  return imports;
}

/** 判断导入来源是否为第三方包 */
function isThirdParty(source: string): boolean {
  // 相对路径
  if (source.startsWith('.') || source.startsWith('/')) return false;
  // @/ 别名
  if (source.startsWith('@/')) return false;
  // 其余视为第三方包
  return true;
}

/** 将 @/ 别名解析为绝对路径 */
function resolveAlias(source: string): string {
  if (source.startsWith('@/')) {
    return path.join(ROOT, source.slice(2));
  }
  return source;
}

/** 将相对导入解析为绝对路径（含扩展名尝试） */
function resolveImportPath(fromFile: string, source: string): string | null {
  const aliased = resolveAlias(source);

  // 已是绝对路径
  if (path.isAbsolute(aliased)) {
    return tryExtensions(aliased);
  }

  // 相对路径
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, aliased);
  return tryExtensions(resolved);
}

/** 尝试添加 .ts / .tsx / .js / .jsx / /index.tsx 等扩展名 */
function tryExtensions(basePath: string): string | null {
  const candidates = [
    basePath,
    basePath + '.ts',
    basePath + '.tsx',
    basePath + '.js',
    basePath + '.jsx',
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** 检查文件是否导出了指定符号 */
function hasExport(filePath: string, symbolName: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  // 精确匹配导出声明
  // export function X / export const X / export class X / export interface X / export type X
  const exportDeclRegex = new RegExp(
    `export\\s+(?:async\\s+)?(?:function|const|let|var|class|interface|type|enum)\\s+${escapeRegex(symbolName)}\\b`,
  );
  if (exportDeclRegex.test(content)) return true;

  // export { X } / export { X, Y } / export { X as Y } / export type { X }
  const exportListRegex = new RegExp(
    `export\\s+(?:type\\s+)?\\{[^}]*\\b${escapeRegex(symbolName)}\\b(?:\\s+as\\s+\\w+)?[^}]*\\}`,
    's',
  );
  if (exportListRegex.test(content)) return true;

  // export default
  if (symbolName === 'default' && /export\s+default\s/.test(content)) return true;

  return false;
}

/** 转义正则特殊字符 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── 主测试逻辑 ──

const SCAN_DIRS = ['app', 'components', 'hooks', 'lib'].map((d) => path.join(ROOT, d));

const allFiles = SCAN_DIRS.flatMap((dir) =>
  fs.existsSync(dir) ? collectFiles(dir) : [],
);

interface ImportIssue {
  file: string;
  line: number;
  source: string;
  issue: string;
}

const issues: ImportIssue[] = [];

for (const filePath of allFiles) {
  const imports = parseImports(filePath);
  const relFile = path.relative(ROOT, filePath);

  for (const imp of imports) {
    // 跳过第三方包
    if (isThirdParty(imp.source)) continue;

    const resolved = resolveImportPath(filePath, imp.source);

    // 检查 1：文件是否存在
    if (!resolved) {
      issues.push({
        file: relFile,
        line: imp.line,
        source: imp.source,
        issue: `文件不存在`,
      });
      continue;
    }

    // 检查 2：具名导出是否存在
    for (const name of imp.names) {
      if (name === 'default') continue; // default 导出太难静态检查
      if (!hasExport(resolved, name)) {
        issues.push({
          file: relFile,
          line: imp.line,
          source: imp.source,
          issue: `导出 '${name}' 不存在于 ${path.relative(ROOT, resolved)}`,
        });
      }
    }
  }
}

describe('导入存在性检查', () => {
  test(`扫描了 ${allFiles.length} 个源文件`, () => {
    expect(allFiles.length).toBeGreaterThan(50);
  });

  test('所有 import 的文件必须存在', () => {
    const fileIssues = issues.filter((i) => i.issue === '文件不存在');
    if (fileIssues.length > 0) {
      const details = fileIssues
        .map((i) => `  ${i.file}:${i.line}  import '${i.source}'`)
        .join('\n');
      expect.fail(`发现 ${fileIssues.length} 个导入的文件不存在:\n\n${details}`);
    }
  });

  test('所有具名导入必须有对应的 export', () => {
    const symbolIssues = issues.filter((i) => i.issue.startsWith('导出'));
    if (symbolIssues.length > 0) {
      const details = symbolIssues
        .map((i) => `  ${i.file}:${i.line}  ${i.issue}`)
        .join('\n');
      expect.fail(`发现 ${symbolIssues.length} 个缺失的导出:\n\n${details}`);
    }
  });
});
