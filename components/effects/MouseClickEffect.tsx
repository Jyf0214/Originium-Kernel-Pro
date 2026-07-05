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

    // 动画结束后移除元素
    setTimeout(() => {
      if (el.parentNode === container) {
        container.removeChild(el);
      }
    }, ANIMATION_DURATION);
  }, []);

  /** 点击事件处理：在点击位置生成多个 emoji */
  const handleClick = useCallback(
    (e: MouseEvent) => {
      for (let i = 0; i < EMOJI_COUNT; i++) {
        // 稍微错开每个 emoji 的创建时间
        setTimeout(() => createEmoji(e.clientX, e.clientY), i * 30);
      }
    },
    [createEmoji],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [enabled, handleClick]);

  if (!enabled) return null;

  return (
    <>
      {/* 内联样式表：emoji 动画关键帧 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .mouse-click-emoji {
              position: fixed;
              pointer-events: none;
              z-index: 9999;
              font-size: 20px;
              will-change: transform, opacity;
              animation: mouse-click-pop ${ANIMATION_DURATION}ms ease-out forwards;
              transform: translate(-50%, -50%);
            }
            @keyframes mouse-click-pop {
              0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(0);
              }
              40% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2) translateY(-10px);
              }
              100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.3) translateY(-60px);
              }
            }
          `,
        }}
      />
      {/* DOM 容器，用于挂载动态生成的 emoji */}
      <div ref={containerRef} className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden" />
    </>
  );
}
