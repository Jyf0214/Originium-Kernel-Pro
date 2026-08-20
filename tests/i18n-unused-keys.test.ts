import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
const ZH_PATH = path.join(ROOT, 'src/i18n/zh-CN.json');
const EN_PATH = path.join(ROOT, 'src/i18n/en.json');

type FlatDict = Record<string, string>;

function flatten(obj: Record<string, unknown>, prefix = ''): FlatDict {
  const out: FlatDict = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out[key] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    }
  }
  return out;
}

function listAllFiles(
  dir: string,
  exts: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'],
): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 排除依赖与构建产物目录：内容随构建变化，纳入扫描会导致检测结果不稳定
      if (['node_modules', '.next', 'out', 'dist', 'build', '.disabled-routes', 'data', 'generated', '.qwen', '.husky'].includes(entry.name)) continue;
      out.push(...listAllFiles(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const zh = flatten(JSON.parse(fs.readFileSync(ZH_PATH, 'utf8')) as Record<string, unknown>);
const en = flatten(JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as Record<string, unknown>);
const allKeys = new Set<string>([...Object.keys(zh), ...Object.keys(en)]);

describe('i18n 双字典一致性', () => {
  it('zh-CN 与 en.json 的 key 集合完全一致', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  it('所有 value 非空字符串', () => {
    for (const [k, v] of Object.entries(zh)) {
      expect.soft(v.trim(), `zh[${k}] 为空`).not.toBe('');
    }
    for (const [k, v] of Object.entries(en)) {
      expect.soft(v.trim(), `en[${k}] 为空`).not.toBe('');
    }
  });

  it('字典中不允许 null/undefined 值', () => {
    const badZh: string[] = [];
    const badEn: string[] = [];
    const walk = (obj: Record<string, unknown>, prefix: string, bad: string[]): void => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v === null || v === undefined) {
          bad.push(key);
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as Record<string, unknown>, key, bad);
        }
      }
    };
    walk(JSON.parse(fs.readFileSync(ZH_PATH, 'utf8')) as Record<string, unknown>, '', badZh);
    walk(JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as Record<string, unknown>, '', badEn);
    expect.soft(badZh, `zh 存在 null/undefined 值: ${badZh.join(', ')}`).toEqual([]);
    expect.soft(badEn, `en 存在 null/undefined 值: ${badEn.join(', ')}`).toEqual([]);
  });
});

describe('i18n 未使用 key 检测', () => {
  /**
   * 未引用 key 数量基线：0（不允许任何未使用键）。
   *
   * 扫描范围：src/、scripts/、tests/、prisma/（排除构建产物与生成代码）。
   * 规则：字典中任何 key 都必须在代码中以字符串字面量形式被引用，
   * 超过 0 即测试失败 → npm run test 非零退出 → 构建被阻断，禁止继续。
   *
   * 代码侧配套约束（src/i18n/keys.ts）：
   * - I18nKey 类型推导自 zh-CN.json，所有 t()/getTranslate() 传键编译期校验；
   * - 动态拼接引用已全部规范化（config.section 显式映射、env descriptionKey/
   *   nameKey 直接携带完整键），代码中不允许再出现 t(`prefix.${var}`) 形式的拼接，
   *   因此检测无需动态豁免机制。
   */
  const BASELINE_UNUSED_COUNT = 0;

  it('未引用 i18n key 数量不得超过基线', () => {
    const searchRoots = [
      path.join(ROOT, 'src'),
      path.join(ROOT, 'scripts'),
      path.join(ROOT, 'tests'),
      path.join(ROOT, 'prisma'),
    ];
    const extraFiles = ['proxy.ts', 'next.config.ts', 'postcss.config.mjs', 'vitest.config.mjs', 'prisma.config.ts']
      .map(f => path.join(ROOT, f))
      .filter(f => fs.existsSync(f));
    const files = searchRoots
      .flatMap(d => listAllFiles(d))
      .filter(f => !f.includes(`${path.sep}generated${path.sep}`))
      .concat(extraFiles);

    // 静态引用：逐文件用 TypeScript 编译器解析为 AST，收集字符串字面量与
    // 无插值模板字符串的文本。AST 遍历能正确处理 JSX（scanner 会把 JSX 文本
    // 连同表达式插值整体当作字符串 token，曾导致在用键漏检）。
    const used = new Set<string>();
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const scriptKind = f.endsWith('.tsx') ? ts.ScriptKind.TSX
        : f.endsWith('.jsx') ? ts.ScriptKind.JSX
        : f.endsWith('.js') ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
      const sourceFile = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, /*setParentNodes*/ true, scriptKind);
      const visit = (node: ts.Node): void => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          const lit = node.text;
          if (lit.length >= 2 && lit.length <= 150 && !lit.includes('$')) {
            used.add(lit);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    const unused: string[] = [];
    for (const key of allKeys) {
      if (!used.has(key)) unused.push(key);
    }

    if (unused.length > 0) {
      console.warn(
        `\n[i18n] 以下 ${unused.length} 个 key 在代码中未被引用:\n  ` +
          unused.sort().join('\n  '),
      );
    }
    expect(
      unused.length,
      `未引用 i18n key 数量 ${unused.length} 超过基线 ${BASELINE_UNUSED_COUNT}，请清理多余 key（不允许任何未使用键）`,
    ).toBeLessThanOrEqual(BASELINE_UNUSED_COUNT);
  });
});

describe('i18n 硬编码中文字符串检测', () => {
  it('扫描 src 下所有代码中的硬编码中文字符串', () => {
    const dirs = [
      path.join(ROOT, 'src/app'),
      path.join(ROOT, 'src/components'),
      path.join(ROOT, 'src/hooks'),
      path.join(ROOT, 'src/lib'),
    ].filter(d => fs.existsSync(d));
    const files = dirs.flatMap(d => listAllFiles(d));

    const hits: { file: string; line: number; text: string }[] = [];
    const chineseLiteralRe = /['"`][^'"`]*[\u4e00-\u9fa5]+[^'"`]*['"`]/;
    // 排除日志输出（console.* 与项目内部 logger.*/log.*）与审计记录
    // （logAudit/auditDeleteResult 调用及其 okDetail/failDetail 参数对象），
    // 均为系统内部日志/审计数据而非 UI 文案
    const logRe = /\b(?:console|logger|log)\.(log|warn|error|info|debug)|\b(?:logAudit|auditDeleteResult)\(|(?:okDetail|failDetail):/;

    for (const f of files) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      let lineIdx = 0;
      for (const line of lines) {
        lineIdx++;
        const trimmed = line.trim();
        // 排除注释行（含 JSX 注释 {/* ... */}）
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('{/*')) continue;
        // 排除 log 输出
        if (logRe.test(line)) continue;
        // 必须含中文字符串字面量
        if (!chineseLiteralRe.test(line)) continue;
        // 不排除 i18n 调用，被 t()/getTranslate() 包裹的中文也标记
        // 因为理想情况下中文应只存在于 i18n 字典中
        hits.push({ file: path.relative(ROOT, f), line: lineIdx, text: trimmed });
      }
    }
    if (hits.length > 0) {
      console.warn(
        `\n[i18n] 命中 ${hits.length} 行硬编码:\n` +
          hits.map(h => `  ${h.file}:${h.line}  ${h.text}`).join('\n'),
      );
    }
    expect(hits.length).toBe(0);
  });
});
