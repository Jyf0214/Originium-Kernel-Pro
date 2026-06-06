import type { ComponentType } from 'react';
import type { CodeProps, HighlightConfig, HighlighterInstance } from './types';
import { createHeading } from './HeadingAnchor';
import { CodeBlock } from './CodeBlock';

/** 主题名映射：配置项 → react-syntax-highlighter 内置样式 */
const themeMap: Record<string, string> = {
  light: 'oneLight',
  dark: 'vscDarkPlus',
};

/** 解析主题名，未匹配时回退到 vscDarkPlus */
export function resolveTheme(theme: string): string {
  return themeMap[theme] ?? 'vscDarkPlus';
}

/** 构建 react-markdown 的 components 映射表 */
export function buildComponents(
  cfg: HighlightConfig,
  highlighter: HighlighterInstance | null,
): Record<string, ComponentType<CodeProps>> {
  return {
    code({ inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className ?? '');
      if (!inline && match) {
        return (
          <CodeBlock
            children={String(children).replace(/\n$/, '')}
            language={match[1] ?? ''}
            highlighter={highlighter}
            cfg={cfg}
          />
        );
      }
      return (
        <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md text-[0.875em] font-mono font-medium" {...props}>
          {children}
        </code>
      );
    },
    h1: createHeading(1),
    h2: createHeading(2),
    h3: createHeading(3),
    h4: createHeading(4),
    h5: createHeading(5),
    h6: createHeading(6),
  };
}
