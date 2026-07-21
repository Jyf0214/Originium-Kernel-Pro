'use client';

import { useEffect } from 'react';
import { dispatchUpdateAvailable } from '@/lib/pwa-events';

/**
 * PWA Service Worker 注册组件
 * 注册 SW 并在检测到新版本时通知 PWAUpdateNotification 组件
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // 监听新 SW 激活，通知用户手动更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新 SW 已就绪，通过事件总线通知 PWAUpdateNotification 显示更新提示
              dispatchUpdateAvailable(registration);
            }
          });
        });
      })
      .catch((err) => {
        // 注册失败不影响正常使用，仅记录
        console.warn('[PWA] Service Worker 注册失败:', err);
      });

    // 监听控制器变更（新 SW 接管），刷新页面以加载新缓存
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return null;
}
