import { useState, useRef, useEffect, useCallback, type ComponentType, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import type { CodeProps, HighlightConfig, HighlighterInstance } from './types';
import { createHeading } from './HeadingAnchor';
import { CodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';

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
function extractLanguage(className: string | undefined): string {
  const match = /language-(\w+)/.exec(className ?? '');
  return match?.[1] ?? '';
}

/** 无语法高亮的代码块——含一键复制按钮（带 ✓ 反馈） */
function UnhighlightedCodeBlock({
  lang,
  codeText,
  children,
}: {
  lang: string;
  codeText: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 组件卸载时清理定时器，避免对已卸载组件调用 setState
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [codeText]);

  return (
    <div className="relative group my-8">
      <pre className="bg-zinc-900 rounded-2xl p-4 text-sm text-zinc-300 overflow-x-auto">
        {lang && <span className="code-lang-badge">{lang}</span>}
        <button
          className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-600 hover:text-zinc-200 group-hover:opacity-100"
          onClick={handleCopy}
          title="复制代码"
          aria-label="复制代码"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
        <code>{children}</code>
      </pre>
    </div>
  );
}

/** 构建 react-markdown 的 components 映射表 */
export function buildComponents(
  cfg: HighlightConfig,
  highlighter: HighlighterInstance | null,
): Record<string, ComponentType<CodeProps>> {
  return {
    pre({ children }: { children: ReactNode }) {
      // 直接透传子元素，避免与 CodeBlock 内部 div 产生多余嵌套
      return <>{children}</>;
    },
    table({ children }: { children: ReactNode }) {
      // 表格外层包裹 overflow-x-auto，防止移动端横向溢出
      return (
        <div className="overflow-x-auto my-6 rounded-xl border border-zinc-100">
          <table>{children}</table>
        </div>
      );
    },
    code({ inline, className, children, ...props }: CodeProps) {
      const lang = extractLanguage(className);
      const codeText = String(children).replace(/\n$/, '');

      // Mermaid 图表 → 交给 MermaidBlock 渲染（含加载态、错误态、自适应宽度）
      if (!inline && lang === 'mermaid') {
        return <MermaidBlock code={codeText} />;
      }

      // 有语言标识的代码块 → 交给 CodeBlock 处理（含高亮、复制、折叠等完整功能）
      if (!inline && lang) {
        return (
          <CodeBlock
            children={codeText}
            language={lang}
            highlighter={highlighter}
            cfg={cfg}
          />
        );
      }

      // 无语言标识的代码块 → 添加语言标签和复制按钮（含视觉反馈）
      if (!inline) {
        return (
          <UnhighlightedCodeBlock lang={lang} codeText={codeText}>
            {children}
          </UnhighlightedCodeBlock>
        );
      }

      // 行内代码
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
