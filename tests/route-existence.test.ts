import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');

/**
 * 路由缺失检查测试
 *
 * 扫描代码中所有前端路由引用，检查对应的 app/<route>/page.tsx 是否存在。
 * 防止类似 37f70f6 提交删除 login 页面但代码仍引用 /login 的问题再次发生。
 */

/** 每个模式的第一个捕获组必须是路由路径（以 / 开头） */
const ROUTE_PATTERNS: RegExp[] = [
  // router.push('/path') / router.replace('/path')
  /router\.(?:push|replace)\s*\(\s*['"`](\/[^'"`?#]+)/g,
  // redirect('/path')
  /redirect\s*\(\s*['"`](\/[^'"`?#]+)/g,
  // window.location.href = '/path' / window.location = '/path'
  /window\.location(?:\.href)?\s*=\s*['"`](\/[^'"`?#]+)/g,
  // location.href = '/path' / location = '/path'（非 window. 前缀）
  /(?<!\.)location(?:\.href)?\s*=\s*['"`](\/[^'"`?#]+)/g,
  // href="/path"（JSX Link 组件属性）
  /\bhref\s*=\s*['"`](\/[^'"`?#]+)/g,
  // pathname === '/path' / pathname == '/path'
  /pathname\s*={1,2}\s*['"`](\/[^'"`?#]+)/g,
];

/** 检查目录下是否有 page.tsx 或 page.ts */
function hasPageFile(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'page.tsx'))
    || fs.existsSync(path.join(dir, 'page.ts'));
}

/** 检查目录内是否有 [...x] 或 [[...x]] catch-all 子目录含 page 文件 */
function hasCatchAllChildPage(dir: string): boolean {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  for (const child of fs.readdirSync(dir)) {
    if (child.startsWith('[...') || child.startsWith('[[...')) {
      if (hasPageFile(path.join(dir, child))) return true;
    }
  }
  return false;
}

/** 检查父目录下是否有 [...nextSeg] 或 [[...nextSeg]] catch-all page */
function hasParentCatchAllPage(parent: string, nextSeg: string): boolean {
  return hasPageFile(path.join(APP_DIR, parent, `[...${nextSeg}]`))
    || hasPageFile(path.join(APP_DIR, parent, `[[...${nextSeg}]]`));
}

/** 检查给定路由是否有对应的 app 目录 page 文件 */
function routeExists(routePath: string): boolean {
  const normalized = routePath.replace(/\/+$/, '') || '/';
  const routeDir = path.join(APP_DIR, normalized);

  // 1) 精确匹配 page.tsx / page.ts
  if (hasPageFile(routeDir)) return true;

  // 2) 路由目录存在 + 内有 catch-all 子目录含 page
  if (hasCatchAllChildPage(routeDir)) return true;

  // 3) 逐级尝试父目录 catch-all 匹配
  const segments = normalized.split('/').filter(Boolean);
  for (let i = 1; i <= segments.length; i++) {
    const parent = segments.slice(0, i).join('/');
    const next = segments[i];
    if (next && hasParentCatchAllPage(parent, next)) return true;
  }

  return false;
}

/** 递归收集指定扩展名的源文件（跳过无关目录） */
function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  const SKIP = new Set(['node_modules', '.next', '.git', 'dist', '.vercel']);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) results.push(...collectFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

/** 从单个文件中提取所有前端路由引用 */
function extractRoutesFromFile(filePath: string): { route: string; line: number }[] {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const found: { route: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();
    // 跳过纯注释行
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    for (const pattern of ROUTE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const route = match[1];
        if (!route) continue;
        // 仅处理前端路由（以 / 开头）
        if (!route.startsWith('/')) continue;
        // 跳过 API 路由（由其他测试覆盖）
        if (route.startsWith('/api/')) continue;
        // 跳过协议-relative URL
        if (route.startsWith('//')) continue;
        // 跳过静态资源
        if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|json|woff|woff2)$/i.test(route)) continue;
        // 跳过模板字符串变量插值 ${...}
        if (route.includes('${')) continue;

        found.push({ route, line: i + 1 });
      }
    }
  }

  return found;
}

// ── 收集所有路由引用（describe 块内共享） ──

const sourceFiles = [
  ...collectFiles(path.join(ROOT, 'app'), ['.tsx', '.ts']),
  ...collectFiles(path.join(ROOT, 'components'), ['.tsx', '.ts']),
  ...collectFiles(path.join(ROOT, 'hooks'), ['.tsx', '.ts']),
  ...collectFiles(path.join(ROOT, 'lib'), ['.ts']),
];

const allRouteRefs: { route: string; file: string; line: number }[] = [];
for (const file of sourceFiles) {
  for (const ref of extractRoutesFromFile(file)) {
    allRouteRefs.push({ route: ref.route, file: path.relative(ROOT, file), line: ref.line });
  }
}

const uniqueRoutes = [...new Set(allRouteRefs.map((r) => r.route))];

describe('路由缺失检查', () => {
  test(`扫描到 ${uniqueRoutes.length} 个唯一前端路由引用`, () => {
    // 至少应扫描到 20+ 个路由（健全性检查）
    expect(uniqueRoutes.length).toBeGreaterThanOrEqual(20);
  });

  test('所有被引用的前端路由必须有对应的 page 文件', () => {
    const missing: { route: string; refs: { file: string; line: number }[] }[] = [];

    for (const route of uniqueRoutes) {
      if (!routeExists(route)) {
        missing.push({
          route,
          refs: allRouteRefs
            .filter((r) => r.route === route)
            .map((r) => ({ file: r.file, line: r.line })),
        });
      }
    }

    if (missing.length > 0) {
      const details = missing
        .map((m) => {
          const locs = m.refs.map((r) => `    ${r.file}:${r.line}`).join('\n');
          return `  ❌ ${m.route}\n  被引用位置:\n${locs}`;
        })
        .join('\n\n');
      expect.fail(`发现 ${missing.length} 个被引用但缺失的路由:\n\n${details}`);
    }
  });

  test('关键路由必须存在', () => {
    const critical = ['/login', '/dashboard', '/posts', '/diary', '/tags', '/about'];
    const missing = critical.filter((r) => !routeExists(r));
    if (missing.length > 0) {
      expect.fail(`关键路由缺失: ${missing.join(', ')}`);
    }
  });
});
