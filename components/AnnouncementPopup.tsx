'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/ui';
import {
  modalContentVariants,
  modalOverlayVariants,
  modalTransition,
  modalOverlayTransition,
} from '@/components/ui/motion';

/** localStorage 持久化 key：永久关闭 */
const STORAGE_KEY_PERMANENT = 'announcement-dismissed';
/** sessionStorage key：本次会话关闭 */
const SESSION_KEY = 'announcement-dismissed-session';

/** 公告内容配置（硬编码默认值，后续可从 config.yaml 读取） */
interface AnnouncementConfig {
  /** 公告标题 */
  title: string;
  /** 公告正文 */
  content: string;
  /** 公告链接（可选） */
  link?: string;
  /** 链接文本 */
  linkText?: string;
}

/** 默认公告配置 */
const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  title: '网站公告',
  content: '欢迎访问本站！这里会发布最新的通知和更新信息。',
  link: '',
  linkText: '了解更多',
};

/**
 * 检查公告是否已被用户关闭
 * 同时检查 localStorage（永久）和 sessionStorage（本次会话）
 */
function isAnnouncementDismissed(): boolean {
  try {
    // 本次会话已关闭
    if (sessionStorage.getItem(SESSION_KEY)) return true;
    // 永久关闭
    if (localStorage.getItem(STORAGE_KEY_PERMANENT)) return true;
  } catch {
    // storage 不可用时不弹出
  }
  return false;
}

/**
 * 记录公告已关闭
 * @param permanent 是否永久关闭
 */
function markDismissed(permanent: boolean): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true');
    if (permanent) {
      localStorage.setItem(STORAGE_KEY_PERMANENT, Date.now().toString());
    }
  } catch {
    // storage 写入失败静默忽略
  }
}

/**
 * 重置公告关闭记录（方便调试）
 * 清除 localStorage 和 sessionStorage 中的关闭记录
 */
export function resetAnnouncement(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PERMANENT);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // 静默忽略
  }
}


/** 公告弹窗组件 */
export function AnnouncementPopup() {
  const [visible, setVisible] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const config = DEFAULT_ANNOUNCEMENT;

  // 首次访问检查是否需要弹出
  useEffect(() => {
    if (!isAnnouncementDismissed()) {
      setVisible(true);
    }
  }, []);

  /** 关闭弹窗 */
  const handleClose = useCallback(() => {
    markDismissed(permanent);
    setVisible(false);
    setPermanent(false);
  }, [permanent]);

  /** 取消按钮 */
  const handleCancel = useCallback(() => {
    handleClose();
  }, [handleClose]);

  /** 确认按钮 */
  const handleOk = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // 无内容时不渲染
  if (!config.title && !config.content) return null;

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
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
          >
            {/* 顶部装饰条 */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

            {/* 关闭按钮 */}
            <button
              onClick={handleCancel}
              className={cn(
                'absolute top-4 right-4 p-1.5 rounded-lg z-10',
                'hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
              aria-label="关闭公告"
            >
              <X size={16} />
            </button>

            {/* 内容区 */}
            <div className="px-6 pt-5 pb-4">
              {/* 标题区：Megaphone 图标 + 标题 */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <Megaphone size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <h3 id="announcement-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {config.title}
                </h3>
              </div>

              {/* 公告正文 */}
              <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {config.content}
              </div>

              {/* 链接（可选） */}
              {config.link && (
                <a
                  href={config.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-block mt-3 text-sm text-amber-600 dark:text-amber-400',
                    'hover:text-amber-700 dark:hover:text-amber-300 transition-colors'
                  )}
                >
                  {config.linkText ?? '了解更多'} &rarr;
                </a>
              )}
            </div>

            {/* 底部按钮区 */}
            <div className="px-6 pb-5 flex flex-col gap-3">
              {/* 永久关闭选项 */}
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                  永久不再显示
                </span>
              </label>

              {/* 确认按钮 */}
              <button
                onClick={handleOk}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                  'hover:from-amber-600 hover:to-orange-600 active:scale-[0.98]',
                  'shadow-sm hover:shadow-md'
                )}
              >
                我知道了
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
