/**
 * react-markdown 组件映射表构建器
 * 组装所有 Markdown 渲染子组件（代码块、提示框、媒体嵌入等）。
 */
import React, { type ComponentType, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import type { CodeProps, HighlightConfig } from './types';
import { createHeading } from './HeadingAnchor';
import { CodeBlock, UnhighlightedCodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';
import { VideoEmbed } from './video-embed';
import { CalloutBlock } from './CalloutBlock';
import { MediaEmbed, MEDIA_URL_RE } from './MediaEmbed';
import { extractLanguage, extractTextContent } from './utils';

/** 构建 react-markdown 的 components 映射表 */
export function buildComponents(
  cfg: HighlightConfig,
): Record<string, ComponentType<CodeProps>> {
  return {
    pre({ children }: { children: ReactNode }) {
      // rehype-pretty-code 生成的 figure 内 pre 直接透传，
      // 由 figure 组件统一包装 CodeBlock 工具栏
      return <>{children}</>;
    },
    figure({ children }: { children: ReactNode }) {
      // rehype-pretty-code 将代码块包裹在 <figure data-rehype-pretty-code-figure> 中
      // 提取 pre 元素（含 Shiki 高亮 HTML 和 data-language 等属性），交给 CodeBlock 添加工具栏
      const childArray = React.Children.toArray(children);
      const preChild = childArray.find(
        (c) => React.isValidElement(c) && c.type === 'pre',
      ) as React.ReactElement | undefined;

      if (preChild) {
        return <CodeBlock cfg={cfg}>{preChild}</CodeBlock>;
      }

      // 非代码 figure（理论上不应出现）：透传
      return <figure>{children}</figure>;
    },
    table({ children }: { children: ReactNode }) {
      return (
        <div className="overflow-x-auto my-6 rounded-xl border border-zinc-100">
          <table>{children}</table>
        </div>
      );
    },
    blockquote({ children }: { children: ReactNode }) {
      return <CalloutBlock>{children}</CalloutBlock>;
    },
    a({ href, children, ...props }: { href?: string; children?: ReactNode; [key: string]: unknown }) {
      const isMedia = href && MEDIA_URL_RE.test(href);
      if (isMedia) {
        return <MediaEmbed href={href}>{children}</MediaEmbed>;
      }

      if (href) {
        const videoEmbed = <VideoEmbed href={href} />;
        if (videoEmbed) return videoEmbed;
      }

      const isOutbound = href && (href.startsWith('http://') || href.startsWith('https://'));

      return (
        <a
          href={href}
          {...(isOutbound ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...props}
        >
          {children}
          {isOutbound && (
            <ExternalLink className="inline-block w-3 h-3 ml-0.5 text-zinc-400" />
          )}
        </a>
      );
    },
    code({ inline, className, children, ...props }: CodeProps) {
      const lang = extractLanguage(className);
      const codeText = typeof children === 'string' ? children : extractTextContent(children);

      // Mermaid 图表 → 交给 MermaidBlock 渲染
      if (!inline && lang === 'mermaid') {
        return <MermaidBlock code={codeText.replace(/\n$/, '')} />;
      }

      // rehype-pretty-code 未加载时的降级：有语言标识但无高亮
      if (!inline && lang && lang !== 'mermaid') {
        return (
          <UnhighlightedCodeBlock lang={lang} codeText={codeText.replace(/\n$/, '')}>
            {children}
          </UnhighlightedCodeBlock>
        );
      }

      // 无语言标识的代码块
      if (!inline) {
        return (
          <UnhighlightedCodeBlock lang={lang} codeText={codeText.replace(/\n$/, '')}>
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
