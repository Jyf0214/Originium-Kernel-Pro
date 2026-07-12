'use client';

import { useEffect, useRef } from 'react';

/**
 * 将 HTML 内容注入到 document.head 中
 *
 * ⚠️ 安全警告：此组件直接将 content 作为 innerHTML 解析并注入 DOM。
 * content 必须是已经消毒过的安全 HTML，否则可能导致存储型 XSS 攻击。
 *
 * 调用方必须使用 sanitizeHeadHtml() 等消毒函数处理 content。
 * 未消毒的用户输入绝对不能传入此组件。
 */
export function HeadInjector({ content }: { content: string }) {
  const nodesRef = useRef<Node[]>([]);

  useEffect(() => {
    if (!content) return;

    // 清理上次注入的节点
    for (const node of nodesRef.current) {
      node.parentNode?.removeChild(node);
    }
    nodesRef.current = [];

    // 使用 DOMParser 进行二次消毒：仅允许安全标签通过
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<head>${content}</head>`, 'text/html');
    const head = doc.head;
    const ALLOWED_TAGS = new Set(['META', 'LINK', 'STYLE', 'TITLE', 'SCRIPT']);
    const ALLOWED_ATTRS: Record<string, Set<string>> = {
      META: new Set(['charset', 'name', 'content', 'http-equiv']),
      LINK: new Set(['rel', 'href', 'type', 'media', 'as', 'crossorigin']),
      STYLE: new Set(['type', 'media']),
      TITLE: new Set(),
      SCRIPT: new Set(['type', 'src', 'async', 'defer']),
    };

    const injected: Node[] = [];
    while (head.firstChild) {
      const child = head.firstChild;
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName;
        if (!ALLOWED_TAGS.has(tag)) {
          head.removeChild(child);
          continue;
        }
        // 移除不在白名单中的属性
        const allowed = ALLOWED_ATTRS[tag];
        if (allowed) {
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            if (!allowed.has(attr.name.toLowerCase())) {
              el.removeAttribute(attr.name);
            }
          }
        }
      }
      const next = head.removeChild(child);
      document.head.appendChild(next);
      injected.push(next);
    }
    nodesRef.current = injected;

    return () => {
      for (const node of nodesRef.current) {
        node.parentNode?.removeChild(node);
      }
      nodesRef.current = [];
    };
  }, [content]);

  return null;
}
