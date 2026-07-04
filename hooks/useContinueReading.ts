'use client';

import { useState, useCallback } from 'react';

/**
 * 继续阅读状态管理 — 检测 localStorage 保存的阅读位置，提供恢复/清除操作
 * 配合 ContinueReadingPrompt 组件使用
 */
export function useContinueReading() {
  const [savedData, setSavedData] = useState<{ position: number; clear: () => void } | null>(null);

  const handleRestore = useCallback((position: number) => {
    requestAnimationFrame(() => {
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      window.scrollTo({ top: scrollHeight * position, behavior: 'smooth' });
    });
    savedData?.clear();
    setSavedData(null);
  }, [savedData]);

  const handleDismiss = useCallback(() => {
    savedData?.clear();
    setSavedData(null);
  }, [savedData]);

  return { savedData, setSavedData, handleRestore, handleDismiss };
}
