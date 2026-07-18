'use client';

import { useEffect, useCallback } from 'react';

/**
 * 客户端交互增强组件
 *
 * 对构建时预渲染的 HTML 做交互增强：
 * - 代码块复制按钮（事件委托）
 * - 代码块折叠/展开
 * - 图片点击预览（Lightbox）
 * - 标题锚点复制（h2/h3 hover 显示链接按钮）
 *
 * 使用事件委托，无需遍历子元素绑定事件。
 */
export function ClientEnhancer({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  /* ── 代码块：复制 ── */
  const handleCopy = useCallback(async (code: string, btn: HTMLElement) => {
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '复制'; }, 2000);
    } catch {
      btn.textContent = '失败';
      setTimeout(() => { btn.textContent = '复制'; }, 2000);
    }
  }, []);

  /* ── 代码块：折叠/展开 ── */
  const handleToggleCollapse = useCallback((btn: HTMLElement) => {
    const pre = btn.closest('pre');
    if (!pre) return;
    const isCollapsed = pre.classList.contains('max-h-40');
    if (isCollapsed) {
      pre.classList.remove('max-h-40', 'overflow-hidden');
      btn.textContent = '折叠';
    } else {
      pre.classList.add('max-h-40', 'overflow-hidden');
      btn.textContent = '展开';
    }
  }, []);

  /* ── 事件委托 ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // 复制按钮
      if (target.classList.contains('code-copy-btn')) {
        const pre = target.closest('pre');
        const code = pre?.querySelector('code')?.textContent ?? '';
        void handleCopy(code, target);
        return;
      }

      // 折叠按钮
      if (target.classList.contains('code-collapse-btn')) {
        handleToggleCollapse(target);
        return;
      }

      // 图片点击 → 打开原图
      if (target.tagName === 'IMG' && target.closest('.prose')) {
        const src = (target as HTMLImageElement).src;
        if (src) {
          window.open(src, '_blank');
        }
        return;
      }
    }

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [containerRef, handleCopy, handleToggleCollapse]);

  /* ── 标题锚点：h2/h3 hover 显示复制链接按钮 ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseEnter(e: MouseEvent) {
      const heading = (e.target as HTMLElement).closest('h2, h3');
      if (!heading) return;
      // 避免重复添加
      if (heading.querySelector('.anchor-copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'anchor-copy-btn ml-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 opacity-0 transition-opacity text-xs';
      btn.textContent = '#';
      btn.title = '复制链接';
      btn.type = 'button';
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const id = heading.id;
        if (!id) return;
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = '#'; }, 2000);
        } catch {
          // 静默失败
        }
      });
      heading.appendChild(btn);
      btn.style.opacity = '1';
    }

    function handleMouseLeave(e: MouseEvent) {
      const heading = (e.target as HTMLElement).closest('h2, h3');
      if (!heading) return;
      const btn = heading.querySelector('.anchor-copy-btn');
      if (btn) {
        (btn as HTMLElement).style.opacity = '0';
        setTimeout(() => btn.remove(), 200);
      }
    }

    container.addEventListener('mouseenter', handleMouseEnter, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);
    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [containerRef]);

  return null;
}
