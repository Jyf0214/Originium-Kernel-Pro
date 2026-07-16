'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tooltipVariants, tooltipTransition } from '@/components/ui/motion';
import { Link, Check } from 'lucide-react';
import { TwitterIcon, WeiboIcon, QQIcon, WeChatIcon } from '@/components/ui/SocialIcons';

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
    weibo: {
      id: 'weibo',
      name: '微博',
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
      name: '微信',
      icon: <WeChatIcon size={16} />,
      shareUrl: '',
    },
  };
}

const SHARE_WINDOW_FEATURES = 'noopener,noreferrer,width=600,height=500';

/** 分享按钮基础样式 */
const BTN_BASE_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors text-sm text-zinc-600 dark:text-zinc-400';

function ShareButtonsInner({ title, url, config, locale: _locale }: ShareButtonsProps) {
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
    window.open(shareUrl, '_blank', SHARE_WINDOW_FEATURES);
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

  const sites = config.sites ?? ['twitter', 'weibo', 'qq', 'wechat'];
  const platforms = buildPlatforms(title, url);
  const visiblePlatforms = sites
    .map((s) => platforms[s])
    .filter((p): p is PlatformDef => p !== undefined);

  return (
    <>
      {/* 复制链接 */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={`${BTN_BASE_CLASS} ${
          copied
            ? '!border-green-300 !bg-green-50 !text-green-600'
            : ''
        }`}
        title="复制链接"
      >
        {copied ? <Check size={16} /> : <Link size={16} />}
        {copyFailed ? <span className="text-red-500">复制失败</span> : '复制链接'}
      </button>

      {/* 平台分享按钮 */}
      {visiblePlatforms.map((platform) => {
        if (platform.id === 'wechat') {
          return (
            <div key={platform.id} ref={wechatBtnRef} className="relative">
              <button
                type="button"
                onClick={() => setWechatHintOpen((prev) => !prev)}
                className={BTN_BASE_CLASS}
                title={platform.name}
              >
                {platform.icon}
                {platform.name}
              </button>

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
                      <p className="mb-2">复制链接到微信分享</p>
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
                        {wechatFailed ? '复制失败' : wechatCopied ? '已复制' : '复制链接'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => handleShare(platform.shareUrl)}
            className={BTN_BASE_CLASS}
            title={platform.name}
          >
            {platform.icon}
            {platform.name}
          </button>
        );
      })}
    </>
  );
}

const ShareButtons = React.memo(ShareButtonsInner);
export default ShareButtons;
