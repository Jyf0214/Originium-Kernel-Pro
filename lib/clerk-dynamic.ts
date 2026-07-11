/**
 * Clerk 动态导入工具
 *
 * 所有对 @clerk/nextjs 的引用都通过此模块进行动态导入，
 * 使得 Clerk 依赖变为可选（optionalDependencies）。
 * 当 Clerk 未安装或未配置环境变量时，相关功能静默降级。
 */

/**
 * 同步检查 Clerk 是否应该启用
 * 基于环境变量（构建时注入）判断
 */
export function isClerkConfigured(): boolean {
  return !!(
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
}

/**
 * 异步检查 Clerk 模块是否可加载
 */
export async function isClerkAvailable(): Promise<boolean> {
  if (!isClerkConfigured()) return false;
  try {
    const mod = await runtimeImport('@clerk/nextjs');
    return !!mod;
  } catch {
    return false;
  }
}

/**
 * 安全的动态模块注册表，替代 new Function / eval 方式
 * 仅允许预注册的模块说明符，防止任意代码注入
 */
const DYNAMIC_IMPORTS: Record<string, () => Promise<unknown>> = {
  '@clerk/nextjs': () => import('@clerk/nextjs'),
  '@clerk/nextjs/server': () => import('@clerk/nextjs/server'),
};

/**
 * 安全的运行时动态 import()
 */
function runtimeImport(specifier: string): Promise<unknown> {
  const loader = DYNAMIC_IMPORTS[specifier];
  if (!loader) {
    throw new Error(`[clerk-dynamic] 未知的动态模块: ${specifier}`);
  }
  return loader();
}

/**
 * 动态加载 @clerk/nextjs（客户端模块）
 */
export async function loadClerkClient<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = await runtimeImport('@clerk/nextjs');
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * 动态加载 @clerk/nextjs/server（服务端模块）
 */
export async function loadClerkServer<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = await runtimeImport('@clerk/nextjs/server');
    return mod as T;
  } catch {
    return null;
  }
}

/**
 * 获取 Clerk auth() 方法，仅服务端使用
 */
export async function getClerkAuth(): Promise<(() => Promise<{ userId: string | null }>) | null> {
  const mod = await loadClerkServer<{ auth: () => Promise<{ userId: string | null }> }>();
  if (!mod?.auth) return null;
  return mod.auth;
}
