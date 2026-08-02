'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tooltipVariants, tooltipTransition } from '@/components/ui/motion';
import { Link, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  TwitterIcon,
  FacebookIcon,
  WeiboIcon,
  QQIcon,
  WeChatIcon,
  TelegramIcon,
  WhatsAppIcon,
  RedditIcon,
  LinkedInIcon,
  EmailIcon,
} from '@/components/ui/SocialIcons';
import { useI18n } from '@/hooks/use-i18n';
import { getTranslate } from '@/i18n/translate';

export interface ShareButtonsProps {
  /** 文章标题 */
  title: string;
  /** 分享 URL */
  url: string;
  /** 分享配置 */
  config: {
    enable: boolean;
    sites?: string[];
  };
  /** 语言偏好（预留） */
  locale?: string;
}

interface PlatformDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  shareUrl: string;
}

function buildPlatforms(title: string, url: string): Record<string, PlatformDef> {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return {
    twitter: {
      id: 'twitter',
      name: 'Twitter',
      icon: <TwitterIcon size={16} />,
      shareUrl: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    facebook: {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon size={16} />,
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    weibo: {
      id: 'weibo',
      name: getTranslate('components.ShareButtons.platforms.weibo'),
      icon: <WeiboIcon size={16} />,
      shareUrl: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    },
    qq: {
      id: 'qq',
      name: 'QQ',
      icon: <QQIcon size={16} />,
      shareUrl: `https://connect.qq.com/widget/shareqq/index.html?title=${encodedTitle}&url=${encodedUrl}`,
    },
    wechat: {
      id: 'wechat',
      name: getTranslate('components.ShareButtons.platforms.wechat'),
      icon: <WeChatIcon size={16} />,
      shareUrl: '',
    },
    telegram: {
      id: 'telegram',
      name: 'Telegram',
      icon: <TelegramIcon size={16} />,
      shareUrl: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    whatsapp: {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <WhatsAppIcon size={16} />,
      shareUrl: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    reddit: {
      id: 'reddit',
      name: 'Reddit',
      icon: <RedditIcon size={16} />,
      shareUrl: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
    linkedin: {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <LinkedInIcon size={16} />,
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    email: {
      id: 'email',
      name: 'Email',
      icon: <EmailIcon size={16} />,
      shareUrl: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  };
}

const SHARE_WINDOW_FEATURES = 'noopener,noreferrer,width=600,height=500';

function ShareButtonsInner({ title, url: initialUrl, config, locale: _locale }: ShareButtonsProps) {
  const { t } = useI18n();
  // 静态导出模式：getSiteUrl() 在构建时返回 example.com 占位值，
  // 客户端挂载后使用 window.location 获取真实 URL
  const [resolvedUrl, setResolvedUrl] = useState(initialUrl);
  useEffect(() => {
    setResolvedUrl(window.location.origin + window.location.pathname);
  }, []);

  const url = resolvedUrl;
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [wechatHintOpen, setWechatHintOpen] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);
  const [wechatFailed, setWechatFailed] = useState(false);
  const wechatBtnRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** 设置延迟定时器：先清除同名旧定时器，再创建新定时器 */
  const setDelayedReset = useCallback((key: string, setState: (v: boolean) => void, delay = 2000) => {
    const prev = timersRef.current.get(key);
    if (prev) clearTimeout(prev);
    timersRef.current.set(key, setTimeout(() => {
      setState(false);
      timersRef.current.delete(key);
    }, delay));
  }, []);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // 关闭微信提示浮层（点击外部时）
  useEffect(() => {
    if (!wechatHintOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wechatBtnRef.current && !wechatBtnRef.current.contains(e.target as Node)) {
        setWechatHintOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wechatHintOpen]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setDelayedReset('copy', setCopied);
    } catch {
      setCopyFailed(true);
      setDelayedReset('copyFailed', setCopyFailed);
    }
  }, [url, setDelayedReset]);

  const handleShare = useCallback((shareUrl: string) => {
    if (shareUrl.startsWith('mailto:')) {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', SHARE_WINDOW_FEATURES);
    }
  }, []);

  const handleWechatCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setWechatCopied(true);
      setDelayedReset('wechatCopied', setWechatCopied);
    } catch {
      setWechatFailed(true);
      setDelayedReset('wechatFailed', setWechatFailed);
    }
  }, [url, setDelayedReset]);

  if (!config.enable) return null;

  const sites = config.sites ?? ['twitter', 'facebook', 'weibo', 'wechat', 'qq', 'telegram', 'whatsapp', 'reddit', 'linkedin', 'email'];
  const platforms = buildPlatforms(title, url);
  const visiblePlatforms = sites
    .map((s) => platforms[s])
    .filter((p): p is PlatformDef => p !== undefined);

  return (
    <>
      {/* 复制链接 */}
      <Button
        variant="secondary"
        size="md"
        autoLoading={false}
        onClick={handleCopyLink}
        className={copied
          ? '!border-green-300 !bg-green-50 !text-green-600'
          : ''}
        title={t('components.ShareButtons.copyLink')}
      >
        {copied ? <Check size={16} /> : <Link size={16} />}
        {copyFailed ? <span className="text-red-500">{t('components.ShareButtons.copyFailed')}</span> : t('components.ShareButtons.copyLink')}
      </Button>

      {/* 平台分享按钮 */}
      {visiblePlatforms.map((platform) => {
        if (platform.id === 'wechat') {
          return (
            <div key={platform.id} ref={wechatBtnRef} className="relative">
              <Button
                variant="secondary"
                size="md"
                autoLoading={false}
                onClick={() => setWechatHintOpen((prev) => !prev)}
                title={platform.name}
              >
                {platform.icon}
                {platform.name}
              </Button>

              {/* 微信提示浮层——向下展开，带进出动效 */}
              <AnimatePresence>
                {wechatHintOpen && (
                  <motion.div
                    variants={tooltipVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={tooltipTransition}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20"
                  >
                    {/* 小三角箭头——指向上方 */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-zinc-900" />
                    <div className="bg-zinc-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg whitespace-nowrap">
                      <p className="mb-2">{t('components.ShareButtons.wechatCopyHint')}</p>
                      <button
                        type="button"
                        onClick={handleWechatCopy}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                          wechatCopied
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                        }`}
                      >
                        {wechatCopied ? <Check size={12} /> : <Link size={12} />}
                        {wechatFailed ? t('components.ShareButtons.copyFailed') : wechatCopied ? t('components.ShareButtons.copied') : t('components.ShareButtons.copyLink')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        return (
          <Button
            key={platform.id}
            variant="secondary"
            size="md"
            autoLoading={false}
            onClick={() => handleShare(platform.shareUrl)}
            title={platform.name}
          >
            {platform.icon}
            {platform.name}
          </Button>
        );
      })}
    </>
  );
}

const ShareButtons = React.memo(ShareButtonsInner);
export default ShareButtons;
