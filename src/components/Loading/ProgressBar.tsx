'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/ui';

interface ProgressBarProps {
  color?: string;
  /** 进度条高度（px） */
  height?: number;
  /** 完成后自动隐藏的延迟（ms） */
  completeDelay?: number;
  className?: string;
}

/**
 * 顶部进度条加载组件
 *
 * - 从屏幕顶部滑入，挂在最顶上
 * - 模拟真实加载进度：先快后慢，接近 100% 时减速
 * - 到达 100% 但未完成时回退至 1% 继续
 * - 完成后自动回收消失
 * - 不显示百分比，纯视觉进度条
 */
export function ProgressBar({
  color = '#c084fc',
  height = 3,
  completeDelay = 300,
  className,
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  // 模拟进度的缓动函数：先快后慢
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  // 进度条动画循环
  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;

    // 基础进度：前 2 秒快速到 90%，之后缓慢增长
    let baseProgress: number;
    if (elapsed < 2000) {
      // 前 2 秒：0% → 90%
      baseProgress = easeOutCubic(elapsed / 2000) * 90;
    } else if (elapsed < 5000) {
      // 2-5 秒：90% → 98%
      baseProgress = 90 + (elapsed - 2000) / 3000 * 8;
    } else if (elapsed < 10000) {
      // 5-10 秒：98% → 99.5%
      baseProgress = 98 + (elapsed - 5000) / 5000 * 1.5;
    } else {
      // 10 秒后：接近 99.9% 但永远不到 100%
      baseProgress = 99.5 + Math.min((elapsed - 10000) / 20000 * 0.4, 0.4);
    }

    // 如果进度达到 99.5% 且还没完成，回退到 1% 重新开始
    if (baseProgress >= 99.5 && !completedRef.current) {
      startTimeRef.current = timestamp;
      baseProgress = 1;
    }

    setProgress(Math.min(baseProgress, 99.9));
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // 挂载时入场动画 + 启动进度
  useEffect(() => {
    // 延迟一帧触发入场动画
    const enterTimer = setTimeout(() => setEntered(true), 50);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(enterTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  // 外部完成方法：暴露给父组件调用
  useEffect(() => {
    const handleComplete = () => {
      completedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
      }, completeDelay);
    };

    // 监听自定义事件
    window.addEventListener('progress-bar-complete', handleComplete);
    return () => window.removeEventListener('progress-bar-complete', handleComplete);
  }, [completeDelay]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999] pointer-events-none',
        'transition-transform duration-300 ease-out',
        entered ? 'translate-y-0' : '-translate-y-full',
        className,
      )}
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full transition-[width] duration-200 ease-out rounded-r-full"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}66, 0 0 4px ${color}44`,
        }}
      />
    </div>
  );
}

/**
 * 触发进度条完成的辅助函数
 * 在页面加载完成后调用
 */
export function completeProgressBar() {
  window.dispatchEvent(new Event('progress-bar-complete'));
}

export default ProgressBar;
