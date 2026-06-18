/** 规范化 slug 生成——TOC 与 MarkdownRenderer 共用此函数以确保锚点 ID 一致 */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/(^-|-$)/g, '') || 'heading';
}
