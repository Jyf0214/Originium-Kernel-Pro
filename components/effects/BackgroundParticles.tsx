'use client';

import { useMemo } from 'react';

/** 粒子数量 */
const PARTICLE_COUNT = 25;

interface Particle {
  id: number;
  /** 初始水平位置（%） */
  left: number;
  /** 初始垂直位置（%） */
  top: number;
  /** 粒子大小（px） */
  size: number;
  /** 动画持续时间（秒） */
  duration: number;
  /** 动画延迟（秒） */
  delay: number;
  /** 水平漂移距离（px） */
  driftX: number;
  /** 垂直漂移距离（px） */
  driftY: number;
  /** 动画名称索引，决定运动轨迹 */
  variant: number;
}

/** 生成随机粒子配置 */
function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 0.5 + Math.random() * 1.5,
    duration: 15 + Math.random() * 15,
    delay: Math.random() * -20,
    driftX: 30 + Math.random() * 80,
    driftY: 40 + Math.random() * 100,
    variant: i % 4,
  }));
}

/**
 * 背景粒子效果组件
 * 在页面背景显示浮动的半透明粒子（圆形点）
 * 使用纯 CSS + DOM 实现，性能优于 Canvas
 *
 * @param enabled - 是否启用效果，默认 false
 */
export function BackgroundParticles({ enabled = false }: { enabled?: boolean }) {
  const particles = useMemo(() => generateParticles(PARTICLE_COUNT), []);

  if (!enabled) return null;

  return (
    <>
      {/* 内联样式表：粒子浮动动画 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes particle-float-0 {
              0%, 100% { transform: translate(0, 0); }
              25% { transform: translate(var(--drift-x), calc(var(--drift-y) * -0.5)); }
              50% { transform: translate(calc(var(--drift-x) * -0.3), var(--drift-y)); }
              75% { transform: translate(calc(var(--drift-x) * -0.8), calc(var(--drift-y) * -0.3)); }
            }
            @keyframes particle-float-1 {
              0%, 100% { transform: translate(0, 0); }
              25% { transform: translate(calc(var(--drift-x) * -0.6), calc(var(--drift-y) * 0.7)); }
              50% { transform: translate(var(--drift-x), calc(var(--drift-y) * -0.4)); }
              75% { transform: translate(calc(var(--drift-x) * 0.4), var(--drift-y)); }
            }
            @keyframes particle-float-2 {
              0%, 100% { transform: translate(0, 0); }
              33% { transform: translate(calc(var(--drift-x) * -1), calc(var(--drift-y) * -0.6)); }
              66% { transform: translate(calc(var(--drift-x) * 0.5), calc(var(--drift-y) * 0.8)); }
            }
            @keyframes particle-float-3 {
              0%, 100% { transform: translate(0, 0); }
              20% { transform: translate(calc(var(--drift-x) * 0.7), calc(var(--drift-y) * -1)); }
              50% { transform: translate(calc(var(--drift-x) * -0.5), calc(var(--drift-y) * 0.5)); }
              80% { transform: translate(calc(var(--drift-x) * -0.9), calc(var(--drift-y) * -0.2)); }
            }
          `,
        }}
      />
      {/* 粒子容器：固定在视口背景，不响应鼠标事件 */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-zinc-400/20 dark:bg-zinc-500/30"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `particle-float-${p.variant} ${p.duration}s ease-in-out ${p.delay}s infinite`,
              willChange: 'transform',
              // CSS 变量传递漂移距离
              '--drift-x': `${p.driftX}px`,
              '--drift-y': `${p.driftY}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}
