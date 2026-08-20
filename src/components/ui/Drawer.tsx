'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { DURATION, EASE_STANDARD } from '@/components/ui/motion';
import { useInertBackground } from '@/hooks/use-inert-background';
import { cn } from '@/lib/ui';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** 抽屉方向：left 从左侧滑入，right 从右侧滑入 */
  side?: 'left' | 'right';
  /** 面板宽度类（如 w-80、w-[300px]、w-[min(50vw,20rem)]） */
  widthClass?: string;
  /** 面板附加类（z-index、响应式显隐等） */
  panelClassName?: string;
  /** 遮罩附加类（背景色、z-index、响应式显隐等） */
  overlayClassName?: string;
  /** 遮罩 z-index 类，默认 z-40 */
  overlayZ?: string;
  /** 面板 z-index 类，默认 z-50 */
  panelZ?: string;
  /** 打开时锁定背景滚动，默认 true */
  lockScroll?: boolean;
  children: ReactNode;
}

/**
 * 全站统一抽屉组件
 *
 * 通用职责：portal 到 body、背景 inert（聚焦陷阱）、ESC 关闭、
 * 背景滚动锁定、遮罩点击关闭、滑入/滑出动画。
 * 视觉差异（宽度、z-index、显隐断点、阴影）由调用方通过 props 定制。
 */
export function Drawer({
  open,
  onClose,
  side = 'right',
  widthClass = 'w-80 max-w-[85vw]',
  panelClassName,
  overlayClassName,
  overlayZ = 'z-40',
  panelZ = 'z-50',
  lockScroll = true,
  children,
}: DrawerProps) {
  const portalRef = useRef<HTMLDivElement>(null);
  // 仅在客户端挂载后渲染 portal，避免 SSR 阶段访问 document
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // 打开期间背景置 inert，避免键盘焦点落入背景（聚焦陷阱）
  useInertBackground(open, portalRef);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // 打开时锁定背景滚动
  useEffect(() => {
    if (!lockScroll) return;
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open, lockScroll]);

  const slideFrom = side === 'right' ? '100%' : '-100%';

  // SSR / 首帧未挂载时不渲染，避免服务端访问 document
  if (!mounted) return null;

  return createPortal(
    <div ref={portalRef}>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key={`drawer-overlay-${side}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.MID, ease: EASE_STANDARD }}
              className={cn('fixed inset-0 bg-black/40 backdrop-blur-sm', overlayZ, overlayClassName)}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              key={`drawer-panel-${side}`}
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, x: slideFrom }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideFrom }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'fixed top-0 h-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-y-auto',
                side === 'right'
                  ? 'right-0 border-l border-zinc-200 dark:border-zinc-700'
                  : 'left-0 border-r border-zinc-200 dark:border-zinc-700',
                widthClass,
                panelZ,
                panelClassName,
              )}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export default Drawer;