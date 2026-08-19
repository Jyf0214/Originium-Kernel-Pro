'use client';

import { useEffect, type RefObject } from 'react';

/**
 * 抽屉/弹层打开时，将背景内容设为 inert（不可聚焦、不可被辅助技术访问），
 * 避免键盘焦点落入背景形成"聚焦陷阱"（移动端抽屉尤其明显）。
 *
 * 要求抽屉通过 createPortal 挂载到 document.body 下，containerRef 指向
 * portal 根元素；遍历 body 直接子节点时跳过 portal 自身即可 inert 全部背景。
 */
export function useInertBackground(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      const el = child as HTMLElement;
      if (el === container || el.contains(container)) continue;
      if (el.inert) continue;
      el.inert = true;
      inerted.push(el);
    }

    return () => {
      inerted.forEach((el) => {
        el.inert = false;
      });
    };
  }, [active, containerRef]);
}