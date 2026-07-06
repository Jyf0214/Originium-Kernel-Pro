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

    // 创建临时容器解析 HTML，将子节点逐个注入 head
    const container = document.createElement('div');
    container.innerHTML = content;
    const injected: Node[] = [];
    while (container.firstChild) {
      const child = container.firstChild;
      document.head.appendChild(child);
      injected.push(child);
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
