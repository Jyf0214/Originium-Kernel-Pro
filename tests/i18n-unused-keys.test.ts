import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const ZH_PATH = path.join(ROOT, 'i18n/zh-CN.json');
const EN_PATH = path.join(ROOT, 'i18n/en.json');

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
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) continue;
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
});

// 默认跳过 — 启用方式:把 .skip 去掉,手动 it.only 自查
describe.skip('i18n 未使用 key 检测(参考用)', () => {
  it('列出未被代码引用的 i18n key', () => {
    const searchRoots = [
      path.join(ROOT, 'app'),
      path.join(ROOT, 'components'),
      path.join(ROOT, 'hooks'),
      path.join(ROOT, 'lib'),
    ];
    const files = searchRoots.flatMap(d => listAllFiles(d));

    const unused: string[] = [];
    for (const key of allKeys) {
      // 转义所有正则元字符,避免 key 中含特殊字符误判
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`['"\`]${escaped}['"\`]`);
      const found = files.some(f => {
        const content = fs.readFileSync(f, 'utf8');
        return re.test(content);
      });
      if (!found) unused.push(key);
    }
    if (unused.length > 0) {
      console.warn(
        `\n[i18n] 以下 ${unused.length} 个 key 在代码中未被引用:\n  ` + unused.join('\n  '),
      );
    }
    expect(unused.length).toBeGreaterThanOrEqual(0);
  });
});

// 默认跳过 — 启用方式:把 .skip 去掉,手动 it.only 自查
describe.skip('i18n 硬编码中文字符串检测(参考用,新代码不应有)', () => {
  it('列出 admin/storage 下硬编码的中文字符串行', () => {
    const dirs = [
      path.join(ROOT, 'app/admin/storage'),
      path.join(ROOT, 'components/admin'),
    ].filter(d => fs.existsSync(d));
    const files = dirs.flatMap(d => listAllFiles(d));

    const hits: { file: string; line: number; text: string }[] = [];
    const chineseLiteralRe = /['"`][^'"`]*[\u4e00-\u9fa5]+[^'"`]*['"`]/;
    const logRe = /console\.(log|warn|error|info|debug)/;

    for (const f of files) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      let lineIdx = 0;
      for (const line of lines) {
        lineIdx++;
        const trimmed = line.trim();
        // 排除注释行
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        // 排除 log 输出
        if (logRe.test(line)) continue;
        // 必须含中文字符串字面量
        if (!chineseLiteralRe.test(line)) continue;
        // 排除 i18n 调用(说明该行已使用 t())
        if (line.includes('t(')) continue;
        hits.push({ file: path.relative(ROOT, f), line: lineIdx, text: trimmed });
      }
    }
    if (hits.length > 0) {
      console.warn(
        `\n[i18n] 命中 ${hits.length} 行硬编码:\n` +
          hits.map(h => `  ${h.file}:${h.line}  ${h.text}`).join('\n'),
      );
    }
    expect(hits.length).toBeGreaterThanOrEqual(0);
  });
});
