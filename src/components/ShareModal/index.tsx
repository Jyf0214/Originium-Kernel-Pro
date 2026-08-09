'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalContentVariants, modalTransition } from '@/components/ui/motion';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { getPlatforms } from '@/components/ShareButtons/share-platforms';
import { ShareModalGrid } from './ShareModalGrid';
import { ShareModalFooter } from './ShareModalFooter';
import { useCopyFeedback } from './use-copy-feedback';
import type { PlatformDef } from '@/components/ShareButtons/types';
import type { ShareModalProps } from './types';

/* ============================================================
   分享弹窗
   ============================================================ */

export default function ShareModal({
  open,
  onClose,
  url: urlProp,
  title: titleProp,
  platforms: platformOverride,
}: ShareModalProps) {
  const { t } = useI18n();
  const shareUrl = urlProp ?? (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = titleProp ?? (typeof document !== 'undefined' ? document.title : '');

  // 复用 ShareButtons 的平台注册表（28px 图标适配弹窗网格）
  const allPlatforms = getPlatforms(28);
  const displayPlatforms = platformOverride
    ? platformOverride.filter(k => allPlatforms[k]).map(k => allPlatforms[k]!)
    : Object.values(allPlatforms);

  const { copied, toast, copy, showToast } = useCopyFeedback(shareUrl);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    // 禁止背景滚动（保存并恢复先前值，避免破坏其他组件的滚动锁定）
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const handleShare = useCallback((platform: PlatformDef) => {
    if (platform.id === 'wechat') {
      showToast(t('components.ShareModal.wechatHint'));
      return;
    }
    const url = platform.shareUrl(shareUrl, shareTitle);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=640,height=480');
    }
  }, [shareUrl, shareTitle, showToast, t]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 遮罩层 */}
          <motion.div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* 卡片 */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ ...modalTransition, duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">{t('components.ShareModal.share')}</h2>
              <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label={t('components.ShareModal.close')} autoLoading={false}>
                <X size={18} />
              </Button>
            </div>
            <ShareModalGrid platforms={displayPlatforms} onShare={handleShare} />
            <ShareModalFooter shareUrl={shareUrl} copied={copied} onCopy={copy} />

            {/* 底部通知 */}
            {toast && (
              <Button variant="primary" autoLoading={false} className="absolute bottom-20 left-1/2 -translate-x-1/2 shadow-lg">
                {toast}
              </Button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
