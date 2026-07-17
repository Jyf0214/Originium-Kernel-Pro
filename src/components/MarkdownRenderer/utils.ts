/**
 * MarkdownRenderer 工具函数
 */

/** 提取代码块语言标签（从 className 中匹配 language-xxx） */
export function extractLanguage(className: string | undefined): string {
  const match = /language-(\w+)/.exec(className ?? '');
  return match?.[1] ?? '';
}

/**
 * 从 React children 中提取纯文本（递归遍历 React 元素树）
 * 用于从 rehype-pretty-code 生成的高亮 HTML 中提取原始代码文本
 */
export function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map((child) => extractTextContent(child)).join('');
  }
  if (
    children &&
    typeof children === 'object' &&
    'props' in children
  ) {
    const el = children as { props: { children?: React.ReactNode } };
    return extractTextContent(el.props.children);
  }
  return '';
}
