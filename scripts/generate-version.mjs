/**
 * 构建时生成版本信息
 *
 * 大版本: 从 package.json 读取
 * 小版本: git commit short hash（代码不变则不变）
 *
 * 输出:
 *   - data/version.json  （供其他脚本/工具读取）
 *   - data/version.ts     （供前端页面 import 的 TS 常量）
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');

// 大版本: package.json version
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const major = pkg.version;

// 小版本: git commit short hash
let minor = 'unknown';
try {
  minor = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf-8' }).trim();
} catch {
  console.warn('[generate-version] git 不可用，小版本设为 unknown');
}

const version = `${major}+${minor}`;

const dataDir = join(root, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

// JSON 版本（供构建工具读取）
writeFileSync(
  join(dataDir, 'version.json'),
  JSON.stringify({ major, minor, version, generatedAt: new Date().toISOString() }, null, 2) + '\n',
);

// TS 常量版本（供前端页面直接 import，无需 API 调用）
writeFileSync(
  join(dataDir, 'version.ts'),
  `/** 构建时自动生成，请勿手动编辑 */\nexport const VERSION = '${version}';\n`,
);

console.log(`[generate-version] ${version}`);
