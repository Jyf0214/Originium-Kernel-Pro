'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalContentVariants, modalTransition } from '@/components/ui/motion';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { ShareModalGrid } from './ShareModalGrid';
import { ShareModalFooter } from './ShareModalFooter';
import { useCopyFeedback } from './use-copy-feedback';
import type { PlatformDef, ShareModalProps } from './types';
import {
  TwitterIcon,
  FacebookIcon,
  WeiboIcon,
  WeChatIcon,
  QQIcon,
  TelegramIcon,
} from '@/components/ui/SocialIcons';

/* ============================================================
   平台注册表
   ============================================================ */

const ALL_PLATFORMS: Record<string, PlatformDef> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    color: '#000000',
    hoverColor: '#333333',
    icon: <TwitterIcon size={28} />,
    shareUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    hoverColor: '#1664D9',
    icon: <FacebookIcon size={28} />,
    shareUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  weibo: {
    id: 'weibo',
    name: '微博',
    color: '#E6162D',
    hoverColor: '#C81023',
    icon: <WeiboIcon size={28} />,
    shareUrl: (url, title) =>
      `https://service.weibo.com/share/share.php?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  wechat: {
    id: 'wechat',
    name: '微信',
    color: '#07C160',
    hoverColor: '#06AD56',
    icon: <WeChatIcon size={28} />,
    shareUrl: () => null,
  },
  qq: {
    id: 'qq',
    name: 'QQ',
    color: '#12B7F5',
    hoverColor: '#0EA5E9',
    icon: <QQIcon size={28} />,
    shareUrl: (url, title) =>
      `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    color: '#0088CC',
    hoverColor: '#0077B3',
    icon: <TelegramIcon size={28} />,
    shareUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
};

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
  const shareUrl = urlProp ?? (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = titleProp ?? (typeof document !== 'undefined' ? document.title : '');

  const displayPlatforms = platformOverride
    ? platformOverride.filter(k => ALL_PLATFORMS[k]).map(k => ALL_PLATFORMS[k]!)
    : Object.values(ALL_PLATFORMS);

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
      showToast('请在微信中粘贴链接分享');
      return;
    }
    const url = platform.shareUrl(shareUrl, shareTitle);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=640,height=480');
    }
  }, [shareUrl, shareTitle, showToast]);

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
              <h2 className="text-lg font-bold text-zinc-900">分享</h2>
              <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="关闭" autoLoading={false}>
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
