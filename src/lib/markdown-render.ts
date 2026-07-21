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
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeStringify from 'rehype-stringify';
import { slugify } from './slugify';

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
  // eslint-disable-next-line complexity -- Mermaid 渲染逻辑包含多种 SVG 消毒和替换路径
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
      // 支持 Mermaid 图表题注：代码块后紧跟的 blockquote 作为 caption
      const nextSibling = v.parent?.children?.[v.index + 1];
      const captionText = nextSibling?.type === 'element' && nextSibling.tagName === 'blockquote'
        ? hastTextContent(nextSibling).trim()
        : '';
      if (captionText && nextSibling) {
        // 移除作为题注的 blockquote
        v.parent.children.splice(v.index + 1, 1);
      }
      const figcaption = captionText
        ? [{ type: 'element', tagName: 'p', properties: { className: ['mermaid-caption'] }, children: [{ type: 'text', value: captionText }] }]
        : [];
      const replacement = svg
        ? { type: 'element', tagName: 'figure', properties: { className: ['my-8', 'overflow-x-auto'], style: { maxWidth: '100%' } }, children: [{ type: 'raw', value: `<div class="flex justify-center">${svg}</div>` }, ...figcaption] }
        : { type: 'element', tagName: 'pre', properties: { className: ['mermaid'] }, children: [{ type: 'text', value: mermaidCode }] };
      if (v.parent?.children && Array.isArray(v.parent.children)) {
        v.parent.children[v.index] = replacement;
      }
    }
  };
}

const INLINE_CODE_CLASSES = [
  '!bg-zinc-100/80', 'dark:!bg-zinc-800/60',
  '!text-pink-600', 'dark:!text-pink-400',
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

export interface RenderMarkdownOptions {
  wikiLinkMap?: Record<string, { url: string; title: string }>;
}

export async function renderMarkdownToHtml(
  content: string,
  options: RenderMarkdownOptions = {},
): Promise<string> {
  const { wikiLinkMap } = options;
  const processed = preprocessWikiLinks(content, wikiLinkMap);

  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypePrismPlus, { showLineNumbers: true, ignoreMissing: true })
    .use(rehypeInlineCodeStyle)
    .use(rehypeHeadingOffset, 1)
    .use(rehypeHeadingIds)
    .use(rehypeMermaid)
    .use(rehypeStringify);

  const result = await pipeline.process(processed);
  return String(result);
}
