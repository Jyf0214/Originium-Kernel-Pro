/**
 * 文章 slug 统一校验
 *
 * 前端编辑器生成 slug 时强制以 / 开头并允许多级路径（/a/b），
 * 后端 POST/PATCH 必须使用同一套规则，避免"新建必 400、编辑却通过"的契约分裂。
 * 校验保持宽松（不限制段字符），只拦截路径穿越与边界非法形态，
 * 避免误伤文件系统中已存在但命名宽松的文章。
 */

/** 校验文章 slug 合法性；undefined 视为未提供（合法，由调用方走兜底 slug） */
export function isValidPostSlug(slug: string | undefined): boolean {
  if (!slug) return true;
  return (
    !slug.includes('..') &&
    !slug.includes('\\') &&
    !slug.startsWith('.') &&
    !slug.startsWith('//') &&
    !slug.endsWith('/')
  );
}