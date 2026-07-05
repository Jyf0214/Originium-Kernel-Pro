'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

/** 彩带颜色类数组 */
const CONFETTI_COLORS = [
  'bg-red-400',
  'bg-blue-400',
  'bg-yellow-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-orange-400',
  'bg-cyan-400',
] as const;

/** 彩带数量 */
const CONFETTI_COUNT = 60;

/** 动画持续时间（毫秒） */
const ANIMATION_DURATION = 4000;

interface ConfettiPiece {
  id: number;
  /** 水平位置（%，从左开始） */
  left: number;
  /** 宽度（px） */
  width: number;
  /** 高度（px） */
  height: number;
  /** 颜色类名 */
  color: string;
  /** 动画延迟（ms） */
  delay: number;
  /** 动画持续时间（ms） */
  duration: number;
  /** 水平漂移（px） */
  drift: number;
  /** 旋转角度（deg） */
  rotation: number;
}

/** 生成彩带配置 */
function generateConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    width: 3 + Math.random() * 4,
    height: 8 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
    delay: Math.random() * 800,
    duration: ANIMATION_DURATION - 500 + Math.random() * 1000,
    drift: (Math.random() - 0.5) * 200,
    rotation: Math.random() * 720 - 360,
  }));
}

interface ConfettiEffectProps {
  /** 是否启用效果 */
  enabled?: boolean;
  /** 是否触发彩带效果 */
  trigger?: boolean;
}

/**
 * 彩带/礼花效果组件
 * 在特定事件触发时从页面顶部下落彩色纸片
 * 使用纯 DOM + CSS 实现
 *
 * @param enabled - 是否启用效果，默认 false
 * @param trigger - 是否触发彩带效果
 */
export function ConfettiEffect({ enabled = false, trigger = false }: ConfettiEffectProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  /** 触发彩带效果 */
  const fire = useCallback(() => {
    const confetti = generateConfetti();
    setPieces(confetti);

    // 动画结束后清除彩带
    setTimeout(() => {
      setPieces([]);
    }, ANIMATION_DURATION + 1500);
  }, []);

  // 外部 trigger 变化时触发
  useEffect(() => {
    if (enabled && trigger) {
      fire();
    }
  }, [enabled, trigger, fire]);

  if (!enabled) return null;

  return (
    <>
      {/* 内联样式表：彩带动画关键帧 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .confetti-piece {
              position: fixed;
              top: -20px;
              pointer-events: none;
              z-index: 9998;
              will-change: transform;
              opacity: 0;
              animation: confetti-fall var(--confetti-duration) ease-in forwards;
              animation-delay: var(--confetti-delay);
            }
            @keyframes confetti-fall {
              0% {
                opacity: 1;
                transform: translateY(0) translateX(0) rotate(0deg) scale(1);
              }
              30% {
                opacity: 1;
              }
              100% {
                opacity: 0;
                transform: translateY(100vh) translateX(var(--confetti-drift)) rotate(var(--confetti-rotation)) scale(0.5);
              }
            }
          `,
        }}
      />
      {/* 彩带容器 */}
      <div ref={containerRef} className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden" aria-hidden="true">
        {pieces.map((p) => (
          <div
            key={p.id}
            className={`confetti-piece ${p.color}`}
            style={{
              left: `${p.left}%`,
              width: `${p.width}px`,
              height: `${p.height}px`,
              '--confetti-delay': `${p.delay}ms`,
              '--confetti-duration': `${p.duration}ms`,
              '--confetti-drift': `${p.drift}px`,
              '--confetti-rotation': `${p.rotation}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}
