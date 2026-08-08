/**
 * access.diary 权限判定（纯函数，前后端共用）
 *
 * 日记条目没有 slug 路径概念，公开/私密规则按整体判定：
 * - public 含 '*' / '/' / '^/' → 整体公开，匿名与普通登录用户可读
 * - 其他情况（默认 private: ['*']）→ 仅管理员可读
 */
export function isDiaryPublic(access?: { public?: string[] } | null): boolean {
  const rules = access?.public;
  if (!Array.isArray(rules)) return false;
  return rules.some((p) => p === '*' || p === '/' || p === '^/');
}
