/**
 * remark 插件：将 Markdown 脚注语法 ([^1] 引用 + [^1]: 定义)
 * 转换为带锚点的 HTML 脚注区块，渲染在文章末尾。
 *
 * 依赖 remark-gfm 已将脚注解析为 MDAST 的
 * footnoteDefinition / footnoteReference 节点。
 * 本插件负责：收集定义 → 替换引用为上标链接 → 追加脚注区块。
 */
import type { Plugin } from 'unified';

/* ── 类型 ── */

/** 收集到的脚注定义 */
interface FootnoteItem {
  id: string;
  index: number;
  content: string;
}

/** 宽松的 AST 节点类型（remark 插件内部使用，不引入完整 mdast 类型） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AstNode = Record<string, any>;

/* ── 工具函数 ── */

/** 判断值是否为非空 AST 节点 */
function isAstNode(val: unknown): val is AstNode {
  return val !== null && val !== undefined && typeof val === 'object' && 'type' in (val as AstNode);
}

/** 从 AST 节点递归提取纯文本 */
function extractText(node: AstNode): string {
  if (node.value !== null && node.value !== undefined) return String(node.value);
  if (Array.isArray(node.children)) {
    return node.children.map((c: AstNode) => extractText(c)).join('');
  }
  return '';
}

/** 回调类型 */
type WalkCallback = (node: AstNode, parent: AstNode | null, key: string, idx: number) => void;

/** 遍历数组子节点 */
function walkArray(
  arr: AstNode[],
  callback: WalkCallback,
  parent: AstNode,
  key: string,
): void {
  for (let i = 0; i < arr.length; i++) {
    if (isAstNode(arr[i])) {
      walkNode(arr[i], callback, parent, key, i);
    }
  }
}

/** 遍历单个 AST 节点的所有子属性，执行回调 */
function walkNode(
  node: AstNode,
  callback: WalkCallback,
  parent: AstNode | null,
  key: string,
  index: number,
): void {
  for (const childKey of Object.keys(node)) {
    if (childKey === 'type' || childKey === 'position') continue;
    const val = node[childKey];
    if (Array.isArray(val)) {
      walkArray(val, callback, node, childKey);
    } else if (isAstNode(val)) {
      walkNode(val, callback, node, childKey, 0);
    }
  }
  callback(node, parent, key, index);
}

/* ── 插件主体 ── */

export const remarkFootnotes: Plugin = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    const root = tree as AstNode;
    const definitions: FootnoteItem[] = [];

    // 第一步：收集所有脚注定义，同时从树中移除
    root.children = root.children.filter((child: AstNode) => {
      if (child.type === 'footnoteDefinition') {
        const id = child.identifier ?? '';
        const content = (child.children ?? [])
          .map((c: AstNode) => extractText(c))
          .join(' ')
          .trim();
        definitions.push({
          id,
          index: definitions.length + 1,
          content,
        });
        return false;
      }
      return true;
    });

    // 无脚注则直接返回
    if (definitions.length === 0) return;

    // 构建 id → 序号映射，用于引用替换
    const idToNum = new Map<string, number>();
    for (const def of definitions) {
      idToNum.set(def.id, def.index);
    }

    // 第二步：遍历整棵树，将 footnoteReference 替换为上标锚点链接
    walkNode(root, (node, parent, key, idx) => {
      if (node.type === 'footnoteReference' && parent && key) {
        const refId = node.identifier ?? '';
        const num = idToNum.get(refId) ?? 0;
        const htmlNode: AstNode = {
          type: 'html',
          value: `<sup><a href="#fn-${refId}" id="fnref-${refId}" class="footnote-ref text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">[${num}]</a></sup>`,
        };
        // 替换当前节点
        const parentChildren = parent[key];
        if (Array.isArray(parentChildren)) {
          parentChildren[idx] = htmlNode;
        }
      }
    }, null, '', -1);

    // 第三步：构建脚注区块 HTML，追加到文档末尾
    const itemsHtml = definitions
      .map(
        (def) =>
          `<li id="fn-${def.id}" class="mb-2 pl-1"><span class="mr-2 text-xs font-semibold text-zinc-400">[${def.index}]</span>${escapeHtml(def.content)} <a href="#fnref-${def.id}" class="footnote-backref text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors" title="返回正文">↩</a></li>`,
      )
      .join('\n        ');

    const footnotesHtml = `
<section class="footnotes text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-8">
  <ol class="list-decimal pl-5 space-y-1">
    ${itemsHtml}
  </ol>
</section>`;

    root.children.push({
      type: 'html',
      value: footnotesHtml,
    });
  };
};

/** 转义 HTML 特殊字符，防止 XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
