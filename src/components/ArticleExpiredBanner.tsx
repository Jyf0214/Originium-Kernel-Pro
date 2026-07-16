'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/ui';

const EXPIRED_DAYS = 180;
const STORAGE_KEY_PREFIX = 'article-expired-dismissed:';

export interface ArticleExpiredBannerProps {
  date: string;
  slug: string;
}

/** 文章过期提示横幅 — 超过 180 天的文章显示提示，可关闭并记忆 */
export function ArticleExpiredBanner({ date, slug }: ArticleExpiredBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 检查 localStorage 是否已关闭过
    const dismissed = localStorage.getItem(STORAGE_KEY_PREFIX + slug);
    if (dismissed) return;

    // 解析日期并判断是否超过 180 天
    const publishTime = new Date(date).getTime();
    if (Number.isNaN(publishTime)) return;

    const diffMs = Date.now() - publishTime;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > EXPIRED_DAYS) {
      setVisible(true);
    }
  }, [date, slug]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY_PREFIX + slug, '1');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'bg-amber-50 dark:bg-amber-900/20',
            'border border-amber-200 dark:border-amber-800',
            'rounded-xl p-4 mb-6',
            'flex items-start gap-3',
          )}
        >
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
            本文发布于 {date}，内容可能已过时，请注意时效性。
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors shrink-0"
            aria-label="关闭提示"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
