'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * PWA 安装提示组件（A2HS）
 * - 监听 beforeinstallprompt 事件，在右下角显示安装按钮
 * - 用户点击后调用 event.prompt() 显示系统安装对话框
 * - 使用 localStorage 记录用户是否已关闭/安装过提示
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);
  const [visible, setVisible] = useState(false);

  const STORAGE_KEY = 'pwa-install-dismissed';

  // 检查是否已被用户关闭或安装过
  const isDismissed = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 已关闭过则不再显示
    if (isDismissed()) return;

    const handler = (e: Event) => {
      // 阻止浏览器默认的迷你信息栏
      e.preventDefault();
      // 保存事件对象，后续调用 prompt()
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 如果已安装，隐藏按钮并记录状态
    const installedHandler = () => {
      setVisible(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // localStorage 不可用时忽略
      }
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isDismissed]);

  /** 点击安装按钮 */
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // 显示系统安装对话框
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      // 用户接受安装，隐藏按钮
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // localStorage 不可用时忽略
      }
    }

    setDeferredPrompt(null);
  };

  /** 用户关闭安装提示 */
  const handleDismiss = () => {
    setVisible(false);
    setDeferredPrompt(null);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage 不可用时忽略
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[997] pwa-notification-enter">
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl px-4 py-3">
        {/* 应用图标 */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-lg">
          🚀
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            安装应用
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            添加到主屏幕，获得更好体验
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
          >
            安装
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
            aria-label="关闭安装提示"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * beforeinstallprompt 事件的 TypeScript 类型补充
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
