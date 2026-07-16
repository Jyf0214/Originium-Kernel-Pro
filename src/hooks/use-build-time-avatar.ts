/**
 * 读取构建时注入的全局头像 URL（window.__AVATAR_URL__）
 *
 * ⚠️ 设计约束：
 * - 头像在构建时写入 HTML，不依赖任何运行时 API 请求
 * - 客户端组件直接读取 window.__AVATAR_URL__ 即可
 */
export function useBuildTimeAvatar(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const url = (window as unknown as Record<string, unknown>).__AVATAR_URL__;
  return typeof url === 'string' && url ? url : undefined;
}
