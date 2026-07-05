/**
 * HTML 和 CSS 消毒工具
 * 用于防止存储型 XSS 攻击
 *
 * 注意：正则方案无法覆盖所有绕过向量（如 HTML 实体编码、嵌套标签等）。
 * 本模块仅用于 <head> 注入内容和 Mermaid SVG 后处理等有限场景，
 * 不替代 DOMPurify 等完整 HTML 消毒库。
 */

// 危险 HTML 标签列表（含自闭合标签、SVG/MathML XSS 向量）
const DANGEROUS_TAGS = /<\s*\/?\s*(script|iframe|object|embed|applet|form|input|button|textarea|select|base|svg|math|xss|layer|ilayer|bgsound)\b[^>]*>[\s\S]*?<\s*\/\s*(script|iframe|object|embed|applet|form|input|button|textarea|select|base|svg|math|xss|layer|ilayer|bgsound)\s*>|<\s*(script|iframe|object|embed|applet|form|input|button|textarea|select|base|svg|math|xss|layer|ilayer|bgsound)\b[^>]*\/?>/gi;

// 事件处理器属性（on*）— 匹配 on 后跟字母/数字/下划线/中文
const EVENT_HANDLER_ATTRS = /\s+on[a-zA-Z0-9_\u4e00-\u9fff]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// javascript: / vbscript: / data: URL 协议（三种危险协议统一拦截）
const DANGEROUS_PROTOCOL = /(?:javascript|vbscript)\s*:/gi;
const JS_URL = /href\s*=\s*(?:"[^"]*javascript\s*:[^"]*"|'[^']*javascript\s*:[^']*')/gi;
const VBS_URL = /href\s*=\s*(?:"[^"]*vbscript\s*:[^"]*"|'[^']*vbscript\s*:[^']*')/gi;
const DATA_URL = /(?:src|href|action|formaction|data)\s*=\s*(?:"[^"]*data\s*:[^"]*"|'[^']*data\s*:[^']*')/gi;
const JS_URL_IN_STYLE = /url\s*\(\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')\s*\)/gi;

// <meta http-equiv="refresh" content="0;url=javascript:...">
const META_REFRESH = /<\s*meta\b[^>]*\bhttp-equiv\s*=\s*(?:"refresh"|'refresh')[^>]*>/gi;

/**
 * 清理 HTML 头部注入内容
 * 移除危险标签、事件处理器和危险协议 URL
 * 保留 <meta>, <link>, <style>, <title> 等安全标签
 */
export function sanitizeHeadHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // 1. 移除危险标签及其内容（script, iframe, svg, math 等）
  sanitized = sanitized.replace(DANGEROUS_TAGS, '');

  // 2. 移除 <meta http-equiv="refresh"> 防止重定向到 JS
  sanitized = sanitized.replace(META_REFRESH, '');

  // 3. 移除事件处理器属性
  sanitized = sanitized.replace(EVENT_HANDLER_ATTRS, '');

  // 4. 移除 javascript:/vbscript: URL
  sanitized = sanitized.replace(JS_URL, ' href=""');
  sanitized = sanitized.replace(VBS_URL, ' href=""');

  // 5. 移除 data: URL（防止 data:text/html 类型 XSS）
  sanitized = sanitized.replace(DATA_URL, ' href=""');

  // 6. 兜底：移除所有 javascript:/vbscript: 协议引用
  sanitized = sanitized.replace(DANGEROUS_PROTOCOL, '');

  return sanitized;
}

/**
 * 清理 CSS 内容
 * 移除 IE 表达式、Firefox XBL 绑定、JavaScript URL 和危险 @import
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';

  let sanitized = css;

  // 1. 移除 IE CSS 表达式
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

  // 2. 移除 Firefox -moz-binding
  sanitized = sanitized.replace(/-moz-binding\s*:[^;]*;/gi, '');

  // 3. 移除 url() 中的 javascript:/vbscript:
  sanitized = sanitized.replace(JS_URL_IN_STYLE, 'url()');

  // 4. 移除 @import 外部 URL
  sanitized = sanitized.replace(/@import\s+(?:url\s*\(\s*)?['"][^'"]+['"]\s*\)?\s*;?/gi, '');

  // 5. 兜底：移除所有 javascript:/vbscript: 协议引用
  sanitized = sanitized.replace(DANGEROUS_PROTOCOL, '');

  return sanitized;
}
