'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from 'antd';
import { Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '@/hooks/use-i18n';

export interface QRCodeDialogProps {
  /** 弹窗是否可见 */
  open: boolean;
  /** 二维码指向的 URL */
  url: string;
  /** 文章标题 */
  title?: string;
  /** 关闭回调 */
  onClose: () => void;
}

export default function QRCodeDialog({ open, url: initialUrl, title, onClose }: QRCodeDialogProps) {
  // 静态导出模式：getSiteUrl() 在构建时返回 example.com 占位值，
  // 客户端挂载后使用 window.location 获取真实 URL
  const [resolvedUrl, setResolvedUrl] = useState(initialUrl);
  useEffect(() => {
    setResolvedUrl(window.location.origin + window.location.pathname);
  }, []);

  const url = resolvedUrl;
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const { t } = useI18n();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (failedTimerRef.current) clearTimeout(failedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      if (failedTimerRef.current) clearTimeout(failedTimerRef.current);
      failedTimerRef.current = setTimeout(() => setCopyFailed(false), 2000);
    }
  }, [url]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(420px, 90vw)"
      className="qr-code-dialog"
      title={
        <span className="flex items-center gap-2 text-base">
          <QrCode size={18} />
          {t('posts.shareQR')}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-5 pt-2 pb-2">
        {/* 二维码图片 — 本地生成，无需外部 API */}
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
          <QRCodeSVG
            value={url}
            size={200}
            level="M"
            includeMargin={false}
            bgColor="white"
            fgColor="#18181b"
            className="block"
          />
        </div>

        {/* 文章标题 */}
        {title && (
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 text-center line-clamp-2 w-full">
            {title}
          </p>
        )}

        {/* URL 输入框 + 复制按钮 */}
        <div className="flex items-stretch w-full">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 min-w-0 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-l-lg outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 text-sm font-medium border transition-colors whitespace-nowrap rounded-r-lg ${
              copied
                ? 'bg-green-50 border-green-300 text-green-600'
                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copyFailed ? '失败' : copied ? '已复制' : '复制'}
          </button>
        </div>

        {/* 在新窗口打开 */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
        >
          <ExternalLink size={14} />
          在新窗口打开
        </a>
      </div>
    </Modal>
  );
}
