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
  'bg-zinc-100/80', 'dark:bg-zinc-800/60',
  'text-pink-600', 'dark:text-pink-400',
  'px-[0.3em]', 'py-[0.15em]',
  'rounded', 'text-[0.875em]', 'font-mono',
  'border', 'border-zinc-200/60', 'dark:border-zinc-700/40',
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
    .use(rehypeMermaid)
    .use(rehypeStringify);

  const result = await pipeline.process(processed);
  return String(result);
}
