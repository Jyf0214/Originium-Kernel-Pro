'use client';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { EASE_STANDARD } from '@/components/ui/motion';

const PROGRESS_STEPS = [10, 30, 60, 80] as const;

/**
 * Pjax 风格页面过渡 — 模拟加载进度条 + 淡入淡出
 *
 * 路由切换时：
 * 1. 顶部显示细长的加载进度条（蓝色渐变）
 * 2. 旧页面淡出 + 上移
 * 3. 新页面淡入 + 下移
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);

  const key = pathname;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 300);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  const handleStart = useCallback(() => {
    setIsLoading(true);
    setProgress(0);
    const steps = PROGRESS_STEPS;
    steps.forEach((val, i) => {
      setTimeout(() => setProgress(val), (i + 1) * 100);
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      if (href === pathname) return;
      handleStart();
    };
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [pathname, handleStart]);

  return (
    <>
      {/* 加载进度条 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent"
          >
            <motion.div
              className="h-full rounded-r-full"
              style={{
                background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 页面过渡动画 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={mounted ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE_STANDARD }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
