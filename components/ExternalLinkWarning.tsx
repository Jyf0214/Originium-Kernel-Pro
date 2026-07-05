'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/ui';
import {
  modalContentVariants,
  modalOverlayVariants,
  modalTransition,
  modalOverlayTransition,
} from '@/components/ui/motion';

/** 外链警告上下文 */
interface ExternalLinkWarningContextType {
  /** 手动触发外链警告 */
  showWarning: (url: string) => void;
}

const ExternalLinkWarningContext = createContext<ExternalLinkWarningContextType>({
  /* 默认空实现，实际由 Provider 提供 */
  showWarning: Function.prototype as (url: string) => void,
});

/** 获取当前站点域名（仅客户端） */
function getSiteOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/** 判断是否为外部链接 */
function isExternalLink(href: string): boolean {
  if (!href) return false;
  // 锚点链接、javascript:、mailto:、tel: 不算外部链接
  if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }
  // 相对路径不是外部链接
  if (href.startsWith('/')) return false;
  // 以协议开头的链接需要判断域名
  try {
    const url = new URL(href);
    const origin = getSiteOrigin();
    if (!origin) return true; // 服务端渲染时保守判断
    return url.origin !== origin;
  } catch {
    // 解析失败（可能是相对路径），不算外部链接
    return false;
  }
}

/** 截断过长的 URL 显示 */
function truncateUrl(url: string, maxLength = 60): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + '...';
}

/** 外链警告弹窗内容 */
function WarningModal({
  url,
  visible,
  onConfirm,
  onCancel,
}: {
  url: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={modalOverlayTransition}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            className="relative w-full max-w-sm mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
          >
            {/* 顶部警告条 */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

            {/* 关闭按钮 */}
            <button
              onClick={onCancel}
              className={cn(
                'absolute top-4 right-4 p-1.5 rounded-lg z-10',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
              aria-label="取消"
            >
              <X size={16} />
            </button>

            {/* 内容区 */}
            <div className="px-6 pt-5 pb-4">
              {/* 标题区 */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <ShieldAlert size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  即将离开本站
                </h3>
              </div>

              {/* 目标 URL */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 mb-3 rounded-lg',
                'bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50'
              )}>
                <ExternalLink size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all truncate">
                  {truncateUrl(url)}
                </span>
              </div>

              {/* 安全提示 */}
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  本站内容不代表外部链接观点，请注意安全。
                </p>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="px-6 pb-5 flex gap-3">
              {/* 取消按钮 */}
              <button
                onClick={onCancel}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
                  'hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98]'
                )}
              >
                取消
              </button>

              {/* 继续前往按钮 */}
              <button
                onClick={onConfirm}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                  'hover:from-amber-600 hover:to-orange-600 active:scale-[0.98]',
                  'shadow-sm hover:shadow-md'
                )}
              >
                继续前往
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 外链警告 Provider — 包裹整个应用 */
export function ExternalLinkWarningProvider({ children }: { children: React.ReactNode }) {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const pendingUrlRef = useRef<string>('');

  /** 显示警告弹窗 */
  const showWarning = useCallback((url: string) => {
    pendingUrlRef.current = url;
    setTargetUrl(url);
    setVisible(true);
  }, []);

  /** 确认前往 */
  const handleConfirm = useCallback(() => {
    const url = pendingUrlRef.current;
    setVisible(false);
    setTargetUrl('');
    pendingUrlRef.current = '';
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  /** 取消 */
  const handleCancel = useCallback(() => {
    setVisible(false);
    setTargetUrl('');
    pendingUrlRef.current = '';
  }, []);

  // 监听文档点击事件，拦截外部链接
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // 向上查找最近的 <a> 标签
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      if (isExternalLink(href)) {
        e.preventDefault();
        e.stopPropagation();
        showWarning(href);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [showWarning]);

  return (
    <ExternalLinkWarningContext.Provider value={{ showWarning }}>
      {children}
      <WarningModal
        url={targetUrl}
        visible={visible}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ExternalLinkWarningContext.Provider>
  );
}

/** 使用外链警告的 hook */
export function useExternalLinkWarning() {
  return useContext(ExternalLinkWarningContext);
}
