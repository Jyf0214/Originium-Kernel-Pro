'use client';

import { useEffect, useCallback, useRef } from 'react';

/** 可选的 emoji 列表 */
const EMOJI_LIST = ['❤️', '⭐', '✨', '💫', '🌟'] as const;

/** 每次点击生成的 emoji 数量 */
const EMOJI_COUNT = 5;

/** 动画持续时间（毫秒） */
const ANIMATION_DURATION = 800;

/**
 * 鼠标点击特效组件
 * 点击页面任意位置时，在点击位置生成爱心/星星动画
 * 使用纯 DOM + CSS 动画实现
 *
 * @param enabled - 是否启用特效，默认 false
 */
export function MouseClickEffect({ enabled = false }: { enabled?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);

  /** 生成单个 emoji 元素并添加到容器 */
  const createEmoji = useCallback((x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return;

    const emoji = EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)]!;

    // 创建绝对定位的 emoji 元素
    const el = document.createElement('span');
    el.textContent = emoji;
    el.className = 'mouse-click-emoji';

    // 随机偏移量，让 emoji 散开
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 40;

    el.style.left = `${x + offsetX}px`;
    el.style.top = `${y + offsetY}px`;

    container.appendChild(el);

    // 动画结束后移除元素，保存 timeout ID 以便清理
    const timeoutId = window.setTimeout(() => {
      if (el.parentNode === container) {
        container.removeChild(el);
      }
      // 从待清理列表中移除
      timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId);
    }, ANIMATION_DURATION);
    timeoutsRef.current.push(timeoutId);
  }, []);

  /** 点击事件处理：在点击位置生成多个 emoji */
  const handleClick = useCallback(
    (e: MouseEvent) => {
      for (let i = 0; i < EMOJI_COUNT; i++) {
        // 稍微错开每个 emoji 的创建时间
        const staggerId = window.setTimeout(() => createEmoji(e.clientX, e.clientY), i * 30);
        timeoutsRef.current.push(staggerId);
      }
    },
    [createEmoji],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('click', handleClick);
    // 在 effect 内部复制 ref 值，确保 cleanup 时引用稳定
    const container = containerRef.current;
    return () => {
      document.removeEventListener('click', handleClick);
      // 清理所有待执行的 timeouts，防止内存泄漏
      timeoutsRef.current.forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });
      timeoutsRef.current = [];
      // 同时清理容器中剩余的 emoji 元素
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [enabled, handleClick]);

  if (!enabled) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden" />
  );
}
