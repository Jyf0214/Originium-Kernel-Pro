/**
 * 构建时生成版本信息
 *
 * 大版本: 从 package.json 读取
 * 小版本: git commit short hash（代码不变则不变）
 *
 * 输出: data/version.json
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

const version = { major, minor, generatedAt: new Date().toISOString() };

const dataDir = join(root, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

writeFileSync(join(dataDir, 'version.json'), JSON.stringify(version, null, 2) + '\n');
console.log(`[generate-version] ${major}+${minor}`);
