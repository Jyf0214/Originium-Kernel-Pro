/**
 * 构建时 Markdown → HTML 渲染模块
 *
 * 在 Node.js 构建阶段将 Markdown 预渲染为完整 HTML，
 * 使 curl / AI 爬虫可直接获取包含正文的页面。
 *
 * 管线：remark-parse → remark-gfm → remark-math
 *     → remark-rehype（MDAST→HAST 桥接）
 *     → rehype-raw → rehype-katex → rehype-prism-plus
 *     → rehype-inline-code-style → rehype-mermaid → rehype-stringify
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeStringify from 'rehype-stringify';
import { getTranslate } from '@/i18n/translate';
import { slugify } from './slugify';

/* ── HTML 净化白名单 ── */

/**
 * 在 rehypeRaw 之后执行 HTML 净化，剥离 on* 事件属性、javascript: 协议
 * 与不在白名单内的标签（iframe/video/audio 仅放行 https/http 资源）。
 * className 必须放行：代码块增强、mermaid 容器等样式类由本管线注入。
 */
const SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'data-theme', 'data-shrinkable', 'data-height-limit'],
    img: [...(defaultSchema.attributes?.img ?? []), 'alt', 'title', 'width', 'height', 'loading', 'referrerPolicy', 'srcSet', 'className'],
    a: [...(defaultSchema.attributes?.a ?? []), 'href', 'title', 'target', 'rel', 'download', 'className'],
    // URL 属性只列属性名，协议限制统一走顶层 protocols（按属性名匹配，
    // 值白名单数组会误伤带 query/哈希的正常 URL）
    iframe: ['src', 'title', 'width', 'height', 'allow', 'allowFullScreen', 'className'],
    video: ['src', 'controls', 'poster', 'width', 'height', 'loop', 'muted', 'autoPlay', 'playsInline', 'className'],
    audio: ['src', 'controls', 'loop', 'muted', 'className'],
    source: ['src', 'srcSet', 'type', 'media', 'sizes'],
    details: [...(defaultSchema.attributes?.details ?? []), 'open', 'className'],
    summary: ['className'],
    th: [...(defaultSchema.attributes?.th ?? []), 'align', 'className'],
    td: [...(defaultSchema.attributes?.td ?? []), 'align', 'className'],
  },
  // 协议白名单：扩展 media 资源属性（src/href/cite/longDesc 默认已有）
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    poster: ['http', 'https'],
    srcSet: ['http', 'https'],
  },
};

/**
 * 剥离 rehype-raw 解析后仍残留的 raw 节点（解析失败/异常片段可能绕过 sanitize
 * 直接进入字符串化阶段，raw 节点会被原样输出）。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hast 树遍历必须用 any
function rehypeStripRawNodes(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'raw') {
        // 仅保留纯文本子内容，移除未解析的原始 HTML
        node.type = 'text';
        node.value = String(node.value ?? '');
        return;
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    }
    walk(tree);
  };
}

/* ── Wiki 链接预处理 ── */

function preprocessWikiLinks(content: string, wikiLinkMap?: Record<string, { url: string; title: string }>): string {
  if (!wikiLinkMap) return content;
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const entry = wikiLinkMap[title];
    return entry ? `[${entry.title ?? title}](${entry.url})` : `[[${title}]]`;
  });
}

/* ── Mermaid 构建时渲染 ── */

let mermaidInstance: { initialize(c: Record<string, unknown>): void; render(id: string, def: string): Promise<{ svg: string }> } | null = null;
let mermaidInitialized = false;
let mermaidCounter = 0;

async function tryRenderMermaid(code: string): Promise<string | null> {
  try {
    mermaidInstance ??= (await import('mermaid')).default;
    if (!mermaidInitialized) {
      mermaidInstance.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
      mermaidInitialized = true;
    }
    const { svg } = await mermaidInstance.render(`mermaid-build-${++mermaidCounter}`, code);
    return svg
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '');
  } catch {
    return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- unified hast AST 遍历必须用 any */

function rehypeMermaid(): any {
  return async (tree: any) => {
    const visits: { node: any; parent: any; index: number }[] = [];

    function isMermaidBlock(node: any): boolean {
      if (node?.type !== 'element' || node.tagName !== 'pre' || !Array.isArray(node.children)) return false;
      const code = node.children[0];
      if (code?.type !== 'element' || code.tagName !== 'code') return false;
      return Array.isArray(code.properties?.className) && (code.properties.className as string[]).some((c: string) => c === 'language-mermaid');
    }

    function walk(node: any, parent: any, index: number) {
      if (!node || typeof node !== 'object') return;
      if (isMermaidBlock(node)) {
        const code = node.children[0];
        const textNode = code?.children?.[0];
        const mermaidCode = String(textNode?.value ?? '');
        if (mermaidCode.trim()) visits.push({ node, parent: parent ?? tree, index });
      }
      if (Array.isArray(node.children)) {
        node.children.forEach((child: any, i: number) => walk(child, node, i));
      }
    }

    walk(tree, null, 0);

    for (let i = visits.length - 1; i >= 0; i--) {
      const v = visits[i];
      if (!v) continue;
      const code = v.node.children?.[0];
      const textNode = code?.children?.[0];
      const mermaidCode = String(textNode?.value ?? '');
      const svg = await tryRenderMermaid(mermaidCode);
      const replacement = svg
        ? { type: 'element', tagName: 'div', properties: { className: ['my-8', 'overflow-x-auto'], style: { maxWidth: '100%' } }, children: [{ type: 'raw', value: `<div class="flex justify-center">${svg}</div>` }] }
        : { type: 'element', tagName: 'pre', properties: { className: ['mermaid'] }, children: [{ type: 'text', value: mermaidCode }] };
      if (v.parent?.children && Array.isArray(v.parent.children)) {
        v.parent.children[v.index] = replacement;
      }
    }
  };
}

const INLINE_CODE_CLASSES = [
  '!bg-zinc-100/80', 'dark:!bg-zinc-800/60',
  '!text-zinc-700', 'dark:!text-zinc-300',
  '!px-[0.3em]', '!py-[0.15em]',
  '!rounded', '!text-[0.875em]', '!font-mono',
  '!border', '!border-zinc-200/60', 'dark:!border-zinc-700/40',
];

function rehypeInlineCodeStyle(): any {
  return (tree: any) => {
    const blockCodeSet = new Set();

    function collectBlockCode(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element' && node.tagName === 'pre' && Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child?.type === 'element' && child.tagName === 'code') blockCodeSet.add(child);
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(collectBlockCode);
    }
    collectBlockCode(tree);

    function styleInlineCode(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element' && node.tagName === 'code' && !blockCodeSet.has(node)) {
        const existing = Array.isArray(node.properties?.className) ? node.properties.className : [];
        node.properties = node.properties || {};
        node.properties.className = [...existing, ...INLINE_CODE_CLASSES];
      }
      if (Array.isArray(node.children)) node.children.forEach(styleInlineCode);
    }
    styleInlineCode(tree);
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── 标题层级偏移 ── */

/**
 * 将所有标题层级下移 offset 级（h1→h2, h2→h3, ...），
 * 用于 CoverHero 已占用 H1 时避免页面出现两个 H1。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hast 树遍历必须用 any
function rehypeHeadingOffset(offset: number): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const level = parseInt(node.tagName[1], 10);
        const newLevel = Math.min(level + offset, 6);
        node.tagName = `h${newLevel}`;
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    }
    walk(tree);
  };
}

/* ── 标题锚点 ID ── */

/** 从 hast 节点中提取纯文本（递归） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hast 树遍历必须用 any
function hastTextContent(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return String(node.value ?? '');
  if (Array.isArray(node.children)) return node.children.map(hastTextContent).join('');
  return '';
}

/**
 * 为所有标题元素添加 id 属性（与 TOC / MarkdownRenderer 共用 slugify），
 * 使构建时预渲染的 HTML 也能被目录锚点正确跳转。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- hast 树遍历必须用 any
function rehypeHeadingIds(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const text = hastTextContent(node).trim();
        if (text && !node.properties?.id) {
          node.properties = node.properties || {};
          node.properties.id = slugify(text);
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    }
    walk(tree);
  };
}

/* ── 主渲染函数 ── */

export interface HighlightRenderOptions {
  theme?: string;
  copy?: boolean;
  lang?: boolean;
  shrink?: boolean;
  heightLimit?: number;
  wordWrap?: boolean;
}

export interface RenderMarkdownOptions {
  wikiLinkMap?: Record<string, { url: string; title: string }>;
  /** 代码块显示配置（highlight 段）：语言徽章 / 复制按钮 / 折叠 / 换行 / 主题 */
  highlight?: HighlightRenderOptions;
}

/**
 * 为构建时 HTML 的代码块应用 highlight 配置：
 * - lang：语言徽章（右上角）
 * - copy：一键复制按钮
 * - shrink + heightLimit：超长代码块折叠（初始状态由 shrink 决定）
 * - wordWrap：是否自动换行
 * - theme：data-theme 钩子（供 CSS 主题化）
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- unified hast AST 遍历必须用 any */
function rehypeCodeBlockEnhance(highlight?: HighlightRenderOptions): any {
  return (tree: any) => {
    if (!highlight) return;
    const {
      copy = true,
      lang = true,
      shrink = false,
      heightLimit = 330,
      wordWrap = true,
      theme,
    } = highlight;

    /** 应用换行策略（wordWrap：自动换行；否则横向滚动） */
    function applyWordWrap(node: any, baseStyle: Record<string, string>) {
      if (wordWrap) {
        baseStyle.whiteSpace = 'pre-wrap';
        baseStyle.wordBreak = 'break-word';
      } else {
        baseStyle.whiteSpace = 'pre';
        baseStyle.overflowX = 'auto';
      }
      node.properties.style = baseStyle;
    }

    /** 超长代码块折叠标记与初始折叠样式，返回是否超长 */
    function applyShrinkMark(node: any, baseStyle: Record<string, string>, textLength: number) {
      const exceedsLimit = heightLimit > 0 && textLength > heightLimit;
      if (!exceedsLimit) return false;
      node.properties['data-shrinkable'] = '1';
      node.properties['data-height-limit'] = String(heightLimit);
      if (shrink) {
        node.properties.style = { ...baseStyle, maxHeight: `${heightLimit}px`, overflow: 'hidden' };
      }
      return true;
    }

    /** 右上角工具条：语言徽章 + 复制按钮 + 折叠按钮 */
    function buildToolbar(langName: string | undefined, exceedsLimit: boolean) {
      const showToolbar = (lang && langName) || copy || exceedsLimit;
      if (!showToolbar) return null;
      const children: any[] = [];
      if (lang && langName) {
        children.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['code-lang-badge'] },
          children: [{ type: 'text', value: langName }],
        });
      }
      if (copy) {
        children.push({
          type: 'element',
          tagName: 'button',
          properties: { type: 'button', className: ['code-copy-btn'] },
          children: [{ type: 'text', value: getTranslate('components.markdown.copy') }],
        });
      }
      if (exceedsLimit) {
        children.push({
          type: 'element',
          tagName: 'button',
          properties: { type: 'button', className: ['code-collapse-btn'] },
          children: [{
            type: 'text',
            value: getTranslate(shrink ? 'components.markdown.expand' : 'components.markdown.collapse'),
          }],
        });
      }
      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-toolbar'] },
        children,
      };
    }

    /** 提取 code 子元素与语言名 */
    function extractCodeInfo(node: any) {
      const code = node.children?.find((c: any) => c?.type === 'element' && c.tagName === 'code');
      const langName = Array.isArray(code?.properties?.className)
        ? (code.properties.className as string[]).find((c: string) => c.startsWith('language-'))?.slice('language-'.length)
        : undefined;
      return { code, langName };
    }

    function walk(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element' && node.tagName === 'pre') {
        const { code, langName } = extractCodeInfo(node);
        const text = code ? hastTextContent(code) : '';

        node.properties = node.properties || {};
        const baseStyle: Record<string, string> = { ...(node.properties.style ?? {}) };
        applyWordWrap(node, baseStyle);
        // 主题钩子（CSS 通过 [data-theme] 定制 token 配色）
        if (theme) node.properties['data-theme'] = theme;
        const exceedsLimit = applyShrinkMark(node, baseStyle, text.length);
        const toolbar = buildToolbar(langName, exceedsLimit);
        if (toolbar) node.children = [toolbar, ...node.children];
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    }
    walk(tree);
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function renderMarkdownToHtml(
  content: string,
  options: RenderMarkdownOptions = {},
): Promise<string> {
  const { wikiLinkMap, highlight } = options;
  const processed = preprocessWikiLinks(content, wikiLinkMap);

  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeRaw)
    // 净化原始 HTML：剥离事件属性 / javascript: 协议 / 白名单外标签
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    .use(rehypeStripRawNodes)
    .use(rehypeKatex)
    .use(rehypePrismPlus, { showLineNumbers: true, ignoreMissing: true })
    .use(rehypeInlineCodeStyle)
    .use(rehypeHeadingOffset, 1)
    .use(rehypeHeadingIds)
    .use(rehypeMermaid)
    .use(rehypeCodeBlockEnhance, highlight)
    .use(rehypeStringify);

  const result = await pipeline.process(processed);
  return String(result);
}
