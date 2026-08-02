'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useI18n } from '@/hooks/use-i18n';
const TOAST_DURATION_MS = 2500;
const COPY_FEEDBACK_DURATION_MS = 2000;

/* ============================================================
   复制反馈 hook
   - copied：复制成功时的勾选状态
   - toast：底部通知文案
   - copy：写入剪贴板并触发反馈
   - showToast：直接显示一条通知
   ============================================================ */

export function useCopyFeedback(shareUrl: string) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(''), TOAST_DURATION_MS);
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch {
      showToast(t('components.useCopyFeedback.copyFailed'));
    }
  }, [shareUrl, showToast, t]);

  return { copied, toast, copy, showToast };
}
