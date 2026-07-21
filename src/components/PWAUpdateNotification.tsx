'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { onUpdateAvailable } from '@/lib/pwa-events';

/**
 * PWA 更新通知组件
 * 当检测到新版本的 Service Worker 时，显示 toast 通知
 * 用户点击后才调用 skipWaiting() 激活新版本并刷新页面
 */
export function PWAUpdateNotification() {
  const [visible, setVisible] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // 监听 PWARegister 发出的更新可用事件
  useEffect(() => {
    const unsubscribe = onUpdateAvailable((reg) => {
      setRegistration(reg);
      setVisible(true);
    });

    return unsubscribe;
  }, []);

  /** 点击刷新：激活新版本 */
  const handleUpdate = useCallback(() => {
    if (!registration) return;

    // 通知新 SW 跳过等待阶段
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

    // 监听控制器变更后刷新页面
    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
      { once: true }
    );

    setVisible(false);
  }, [registration]);

  /** 用户关闭通知（暂时不更新） */
  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pwa-notification-enter">
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 border border-zinc-700 dark:border-zinc-600 shadow-2xl px-4 py-3 max-w-[90vw]">
        {/* 更新图标 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <RefreshCw size={16} className="text-emerald-400" />
        </div>

        <span className="text-sm text-zinc-100 dark:text-zinc-100 whitespace-nowrap">
          发现新版本
        </span>

        <div className="flex items-center gap-1.5 ml-1">
          <button
            onClick={handleUpdate}
            className="px-3 py-1.5 text-xs font-medium text-zinc-900 bg-emerald-400 rounded-lg hover:bg-emerald-300 active:bg-emerald-500 transition-colors"
          >
            刷新
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-700"
            aria-label="暂不更新"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
