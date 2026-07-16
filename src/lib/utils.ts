/**
 * 通用工具函数
 *
 * 放置跨模块共用的纯函数，避免各模块重复实现。
 */

/**
 * 转义 HTML 特殊字符，防止 XSS 注入
 *
 * 转义字符: & < > " '
 * 适用于邮件 HTML、报告页面、模板渲染等需要安全输出用户内容的场景
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
