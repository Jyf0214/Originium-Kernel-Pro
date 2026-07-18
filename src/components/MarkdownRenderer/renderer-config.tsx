/**
 * react-markdown 组件映射表构建器
 * 组装所有 Markdown 渲染子组件（代码块、提示框、媒体嵌入等）。
 */
import { type ComponentType, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import type { CodeProps, HighlightConfig, HighlighterInstance } from './types';
import { createHeading } from './HeadingAnchor';
import { CodeBlock, UnhighlightedCodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';
import { VideoEmbed } from './video-embed';
import { CalloutBlock } from './CalloutBlock';
import { MediaEmbed, MEDIA_URL_RE } from './MediaEmbed';
import { extractLanguage } from './utils';

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
    blockquote({ children }: { children: ReactNode }) {
      return <CalloutBlock>{children}</CalloutBlock>;
    },
    a({ href, children, ...props }: { href?: string; children?: ReactNode; [key: string]: unknown }) {
      // 媒体文件（mp4/webm/ogg 等）→ 原生播放器
      const isMedia = href && MEDIA_URL_RE.test(href);
      if (isMedia) {
        return <MediaEmbed href={href}>{children}</MediaEmbed>;
      }

      // YouTube / Bilibili 视频链接 → iframe 嵌入播放器
      if (href) {
        const videoEmbed = <VideoEmbed href={href} />;
        if (videoEmbed) return videoEmbed;
      }

      // 外部链接（http/https）→ 新窗口打开 + ExternalLink 图标
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

      // 行内代码 — 轻量 badge 风格，不打断段落阅读流
      return (
        <code className="bg-zinc-100/80 dark:bg-zinc-800/60 text-pink-600 dark:text-pink-400 px-[0.3em] py-[0.15em] rounded text-[0.875em] font-mono border border-zinc-200/60 dark:border-zinc-700/40" {...props}>
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
