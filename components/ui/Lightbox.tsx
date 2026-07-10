'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import { cn } from '@/lib/ui';
import { EASE_STANDARD, EASE_FAST } from '@/components/ui/motion';

/** 键盘快捷键提示是否已关闭的 localStorage key */
const SHORTCUT_HINT_DISMISSED_KEY = 'lightbox-shortcut-hint-dismissed';

interface LightboxProps {
  /** 图片 URL 列表 */
  images: string[];
  /** 图片 alt 描述列表，与 images 一一对应 */
  alts?: string[];
  /** 初始显示的图片索引 */
  initialIndex: number;
  /** 关闭灯箱回调 */
  onClose: () => void;
  /** 控制灯箱可见性，用于 AnimatePresence 播放进出动画 */
  isOpen?: boolean;
}

export function Lightbox({ images, alts, initialIndex, onClose, isOpen = true }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showHint, setShowHint] = useState(() => {
    // 首次打开时检查是否已经关闭过快捷键提示
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem(SHORTCUT_HINT_DISMISSED_KEY);
  });
  const thumbContainerRef = useRef<HTMLDivElement>(null);

  // initialIndex 外部变化时同步内部状态
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const total = images.length;
  const visible = isOpen && images.length > 0;
  // 当前图片的 alt 描述
  const currentAlt = alts?.[currentIndex] ?? '';

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % total);
  }, [total]);

  // ESC 关闭 + 左右箭头切换（仅灯箱可见时生效）
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose, goPrev, goNext]);

  // body scroll lock（仅灯箱可见时锁定）
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // 当前图片切换时，自动滚动缩略图到可视区域
  useEffect(() => {
    if (!thumbContainerRef.current) return;
    const container = thumbContainerRef.current;
    const activeThumb = container.children[currentIndex] as HTMLElement | undefined;
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex]);

  /** 关闭快捷键提示并记忆到 localStorage */
  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem(SHORTCUT_HINT_DISMISSED_KEY, '1');
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        /* 背景遮罩：opacity 进出过渡 */
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_STANDARD }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80"
          onClick={onClose}
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="关闭灯箱"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 图片展示区域：占满中间空间 */}
          <div className="flex-1 flex items-center justify-center w-full relative min-h-0">
            {/* 左箭头 */}
            {total > 1 && (
              <button
                type="button"
                className="absolute left-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="上一张"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* 图片内容：scale + opacity 进出过渡 */}
            <AnimatePresence mode="wait">
              <motion.img
                key={`lightbox-img-${currentIndex}`}
                src={images[currentIndex]}
                alt={currentAlt}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: EASE_STANDARD }}
                className="max-w-[85vw] max-h-[75vh] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </AnimatePresence>

            {/* 右箭头 */}
            {total > 1 && (
              <button
                type="button"
                className="absolute right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="下一张"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* 底部信息区域：图片描述 + 缩略图导航 + 计数器 */}
          <div
            className="w-full flex flex-col items-center gap-2 pb-4 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图片标题/描述（从 alt 读取） */}
            {currentAlt && (
              <motion.p
                key={`lightbox-alt-${currentIndex}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_FAST }}
                className="text-white/80 text-sm text-center max-w-[80vw] truncate"
              >
                {currentAlt}
              </motion.p>
            )}

            {/* 缩略图导航条 */}
            {total > 1 && (
              <div
                ref={thumbContainerRef}
                className="flex items-center gap-2 overflow-x-auto max-w-[80vw] py-1 px-2 scrollbar-hide"
              >
                {images.map((src, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    className={cn(
                      'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
                      i === currentIndex
                        ? 'border-white scale-105'
                        : 'border-transparent bg-zinc-700/50 p-1 hover:border-white/50',
                    )}
                    onClick={() => setCurrentIndex(i)}
                    aria-label={`查看第 ${i + 1} 张图片`}
                  >
                    <img
                      src={src}
                      alt={alts?.[i] ?? ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* 底部计数器 */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-sm">
                {currentIndex + 1} / {total}
              </span>
            </div>
          </div>

          {/* 键盘快捷键提示 overlay（首次打开时显示，点击后隐藏，localStorage 记忆） */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                key="shortcut-hint"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: EASE_STANDARD }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 text-white/90 text-sm shadow-lg border border-white/10 cursor-pointer"
                onClick={dismissHint}
              >
                <Keyboard className="w-5 h-5 flex-shrink-0 text-white/60" />
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">←</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">→</kbd>
                    <span className="text-white/60">切换</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">Esc</kbd>
                    <span className="text-white/60">关闭</span>
                  </span>
                </div>
                <span className="text-white/40 text-xs ml-2">点击关闭</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
