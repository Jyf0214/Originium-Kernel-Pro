import { useState, useRef, useEffect, useCallback, type ComponentType, type ReactNode } from 'react';
import { Copy, Check, Info, AlertTriangle, Lightbulb, Flame } from 'lucide-react';
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
    }).catch(() => {
      /* 剪贴板写入失败时静默忽略 */
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

/* ── Callout/Alert 提示框 ── */

const CALLOUT_STYLES: Record<string, { icon: ReactNode; bg: string; border: string; iconColor: string }> = {
  note:    { icon: <Info size={18} />,              bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',    iconColor: 'text-blue-600 dark:text-blue-400' },
  tip:     { icon: <Lightbulb size={18} />,          bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  warning: { icon: <AlertTriangle size={18} />,      bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-200 dark:border-amber-800',  iconColor: 'text-amber-600 dark:text-amber-400' },
  danger:  { icon: <Flame size={18} />,              bg: 'bg-red-50 dark:bg-red-950/30',      border: 'border-red-200 dark:border-red-800',      iconColor: 'text-red-600 dark:text-red-400' },
};

const CALLOUT_DEFAULT = CALLOUT_STYLES.note;

/** 解析 > [!NOTE] 语法的 blockquote → callout 提示框 */
function CalloutBlock({ children }: { children: ReactNode }) {
  // 从 children 中提取文本，匹配 > [!type] 模式
  const text = extractPlainText(children);
  const match = /^\[!(note|tip|warning|danger)\]\s*/i.exec(text);
  if (!match) {
    // 非 callout 语法，保持原始 blockquote 样式
    return <blockquote>{children}</blockquote>;
  }

  const type = (match[1] ?? 'note').toLowerCase();
  const style = (CALLOUT_STYLES[type] ?? CALLOUT_DEFAULT) as { icon: ReactNode; bg: string; border: string; iconColor: string };
  // 移除 [!TYPE] 前缀后的纯内容
  const content = text.replace(/^\[!(?:note|tip|warning|danger)\]\s*/i, '');

  return (
    <div className={`my-6 flex gap-3 rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>{style.icon}</div>
      <div className="min-w-0 text-sm leading-relaxed">{content}</div>
    </div>
  );
}

/** 从 ReactNode 中递归提取纯文本 */
function extractPlainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractPlainText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractPlainText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/* ── 视频/音频嵌入 ── */

/** 匹配视频/音频 URL 的正则 */
const MEDIA_URL_RE = /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i;

/** 媒体嵌入组件：根据文件类型渲染 <video> 或 <audio> */
function MediaEmbed({ href, children }: { href?: string; children?: ReactNode }) {
  if (!href || !MEDIA_URL_RE.test(href)) return <a href={href}>{children}</a>;

  const ext = href.match(/\.(\w+)(\?.*)?$/)?.[1]?.toLowerCase() ?? '';
  const isAudio = ['mp3', 'ogg', 'wav', 'flac', 'aac'].includes(ext);

  if (isAudio) {
    return (
      <div className="my-6">
        <audio controls preload="metadata" className="w-full rounded-xl">
          <source src={href} />
          您的浏览器不支持音频播放。
        </audio>
      </div>
    );
  }

  return (
    <div className="my-6">
      <video controls preload="metadata" className="w-full rounded-xl" playsInline>
        <source src={href} />
        您的浏览器不支持视频播放。
      </video>
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
    blockquote({ children }: { children: ReactNode }) {
      return <CalloutBlock>{children}</CalloutBlock>;
    },
    a({ href, children, ...props }: { href?: string; children?: ReactNode; [key: string]: unknown }) {
      // 外部链接安全处理 + 视频/音频嵌入
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
      const isMedia = href && MEDIA_URL_RE.test(href);
      if (isMedia) {
        return <MediaEmbed href={href}>{children}</MediaEmbed>;
      }
      return (
        <a
          href={href}
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...props}
        >
          {children}
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
