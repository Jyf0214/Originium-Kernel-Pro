'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { tooltipVariants, tooltipTransition } from '@/components/ui/motion';
import { Link, Check } from 'lucide-react';

/** Twitter / X 图标 */
function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** 微博图标 */
function WeiboIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.825.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.307-.361-.167-.592.138-.23.437-.346.672-.247.243.09.322.346.184.586zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.706-.118 3.61 1.801 4.267 1.983.681 4.318-.254 5.139-2.048.8-1.751.017-3.736-2.083-4.337z" />
      <path d="M17.845 14.712c-.163-.498-.528-.875-.945-1.147-.376-.238-.838-.393-1.265-.486-.425-.094-.91-.115-1.368-.051-.462.064-.895.22-1.255.464v-.011c.038-.076.08-.152.124-.226.516-.87 1.378-1.517 2.435-1.86 1.052-.343 2.246-.382 3.332.044.57.222 1.09.567 1.536 1.024.442.451.8 1.006 1.065 1.633.267.631.437 1.334.438 2.073h-4.102z" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

/** QQ 图标 */
function QQIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.395 15.035a39.548 39.548 0 0 0-1.51-4.346c.048-.643.08-1.308.08-1.985 0-5.16-3.45-9.346-7.965-9.346S4.035 3.544 4.035 8.704c0 .677.032 1.342.08 1.985a39.548 39.548 0 0 0-1.51 4.346c-.482 1.644-.177 3.158.313 3.753.49.595 1.648.526 2.675.305.278-.06.559-.088.837-.088 1.17 0 1.88.391 2.208.678.314.264.391.301.524.301.133 0 .21-.037.524-.301.328-.287 1.038-.678 2.208-.678.278 0 .559.028.837.088 1.027.221 2.185.29 2.675-.305.49-.595.796-2.109.313-3.753zM7.465 13.284c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm9.07 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5z" />
    </svg>
  );
}

/** 微信图标 */
function WechatIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zM14.75 13.74a.96.96 0 0 1 .962.966.96.96 0 0 1-.962.966.96.96 0 0 1-.961-.966.96.96 0 0 1 .961-.966zm4.5 0a.96.96 0 0 1 .962.966.96.96 0 0 1-.962.966.96.96 0 0 1-.961-.966.96.96 0 0 1 .961-.966z" />
    </svg>
  );
}

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
      icon: <WechatIcon size={16} />,
      shareUrl: '',
    },
  };
}

const SHARE_WINDOW_FEATURES = 'noopener,noreferrer,width=600,height=500';

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

  const btnBaseClass =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors text-sm text-zinc-600 dark:text-zinc-400';

  return (
    <>
      {/* 复制链接 */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={`${btnBaseClass} ${
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
                className={btnBaseClass}
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
            className={btnBaseClass}
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
