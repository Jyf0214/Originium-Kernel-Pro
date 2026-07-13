'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_STANDARD } from '@/components/ui/motion';

/**
 * 全局页面过渡包装器
 *
 * 路由切换时播放淡入动画：opacity 0→1 + translateY(8px→0)
 * 配合 Next.js loading.tsx 实现平滑过渡效果
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3, ease: EASE_STANDARD }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
