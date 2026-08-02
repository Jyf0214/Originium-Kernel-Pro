/**
 * HTML 和 CSS 消毒工具
 * 用于防止存储型 XSS 攻击
 *
 * 安全说明：基于正则的净化天然存在绕过风险。
 * 此模块作为纵深防御的一层，不应作为唯一防线。
 * 关键路径仍应使用 DOMPurify 等 DOM parser 进行净化。
 */

// ─── HTML 标签黑名单 ───────────────────────────────────────────────

// 危险 HTML 标签（含自闭合标签和嵌套内容）
const DANGEROUS_TAGS = /<\s*\/?\s*(script|iframe|object|embed|applet|form|input|button|textarea|select|base|meta|link|style|svg|math|details|dialog|template|slot|noscript)\b[^>]*>[\s\S]*?<\s*\/\s*(script|iframe|object|embed|applet|form|input|button|textarea|select|base|meta|link|style|svg|math|details|dialog|template|slot|noscript)\s*>|<\s*(script|iframe|object|embed|applet|form|input|button|textarea|select|base|meta|link|style|svg|math|details|dialog|template|slot|noscript)\b[^>]*\/?>/gi;

// ─── 事件处理器和危险属性 ─────────────────────────────────────────

// 事件处理器属性（on*）— 包括 HTML 实体编码变体
const EVENT_HANDLER_ATTRS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// 危险属性（src/href/action 等指向外部资源的属性）
const DANGEROUS_ATTRS = /\s+(src|href|action|formaction|data|codebase|dynsrc|lowsrc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// ─── 协议黑名单 ───────────────────────────────────────────────────

// javascript: URL（允许任意空白字符和 HTML 实体编码）
const JS_URL = /(?:href|src|action|formaction|data)\s*=\s*(?:"\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t\s*:)[^"]*"|'\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t\s*:)[^']*')/gi;

// javascript:/vbscript: 协议检测（兜底安全网）
const JS_PROTOCOL = /(?:java|vb)s\s*c\s*r\s*i\s*p\s*t\s*:/gi;

// data: URL（可能携带恶意内容）
const DATA_URL = /data\s*:\s*text\/html/gi;

// ─── CSS 危险模式 ─────────────────────────────────────────────────

// IE CSS 表达式
const CSS_EXPRESSION = /expression\s*\([^)]*\)/gi;

// Firefox -moz-binding
const MOZ_BINDING = /-moz-binding\s*:[^;]*;/gi;

// CSS url() 中的危险协议
const CSS_URL_DANGEROUS = /url\s*\(\s*(?:"\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:)[^"]*"|'\s*(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:)[^']*')\s*\)/gi;

// @import 外部 URL
const CSS_IMPORT = /@import\s+(?:url\s*\(\s*)?['"][^'"]+['"]\s*\)?\s*;?/gi;

// CSS expression 变体（IE5-IE11）
const CSS_EXPRESSION_VARIANT = /(?:expression|-behavior|binding)\s*[:=]/gi;

/**
 * 清理 HTML 头部注入内容
 * 移除危险标签、事件处理器和危险协议 URL
 * 保留 <meta>, <link>, <style>, <title> 等安全标签
 */
export function sanitizeHeadHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // 1. 移除危险标签及其内容
  sanitized = sanitized.replace(DANGEROUS_TAGS, '');

  // 2. 移除事件处理器属性
  sanitized = sanitized.replace(EVENT_HANDLER_ATTRS, '');

  // 3. 移除危险属性（src/href/action 等指向外部资源的属性）
  sanitized = sanitized.replace(DANGEROUS_ATTRS, ' data-removed=""');

  // 4. 移除 javascript:/vbscript: URL
  sanitized = sanitized.replace(JS_URL, ' data-removed=""');

  // 5. 移除 data:text/html URL（可能携带恶意内容）
  sanitized = sanitized.replace(DATA_URL, '');

  // 6. 兜底：移除所有 javascript:/vbscript: 协议引用
  sanitized = sanitized.replace(JS_PROTOCOL, '');

  return sanitized;
}

/**
 * 清理 CSS 内容
 * 移除 IE 表达式、Firefox XBL 绑定、危险 URL 和 @import
 */
export function sanitizeCss(css: string): string {
  if (!css) return '';

  let sanitized = css;

  // 1. 移除 IE CSS 表达式
  sanitized = sanitized.replace(CSS_EXPRESSION, '');

  // 2. 移除 CSS expression 变体
  sanitized = sanitized.replace(CSS_EXPRESSION_VARIANT, '');

  // 3. 移除 Firefox -moz-binding
  sanitized = sanitized.replace(MOZ_BINDING, '');

  // 4. 移除 url() 中的危险协议
  sanitized = sanitized.replace(CSS_URL_DANGEROUS, 'url()');

  // 5. 移除 @import 外部 URL
  sanitized = sanitized.replace(CSS_IMPORT, '');

  // 6. 兜底：移除所有 javascript:/vbscript: 协议引用
  sanitized = sanitized.replace(JS_PROTOCOL, '');

  return sanitized;
}
