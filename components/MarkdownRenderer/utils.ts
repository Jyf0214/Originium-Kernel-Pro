/**
 * MarkdownRenderer 工具函数
 * 包含主题解析、语言提取等辅助功能。
 */

/** 主题名映射：配置项 → react-syntax-highlighter 内置样式 */
const themeMap: Record<string, string> = {
  light: 'oneLight',
  dark: 'vscDarkPlus',
};

/** 解析主题名，未匹配时回退到 vscDarkPlus */
export function resolveTheme(theme: string): string {
  return themeMap[theme] ?? 'vscDarkPlus';
}

/** 提取代码块语言标签（从 className 中匹配 language-xxx） */
export function extractLanguage(className: string | undefined): string {
  const match = /language-(\w+)/.exec(className ?? '');
  return match?.[1] ?? '';
}
