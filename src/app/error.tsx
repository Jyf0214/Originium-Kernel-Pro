'use client';

import { useState } from 'react';
import { AlertTriangle, Copy, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/ui';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/hooks/use-i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  const copyError = async () => {
    const text = [
      isDev ? error.message : '',
      error.digest ? `Digest: ${error.digest}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板写入失败，静默忽略
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-50 p-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">{t('error.pageError')}</h1>
          <p className="text-zinc-500">
            {isDev
              ? (error.message || t('error.unexpected'))
              : t('error.unexpected')}
          </p>
        </div>
        {/* 详情折叠 */}
        {(error.message || error.digest) && (
          <div className="text-left">
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 mx-auto transition-colors"
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  showDetail && 'rotate-180'
                )}
              />
              {t('error.detail')}
            </button>
            {showDetail && (
              <pre className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 overflow-auto whitespace-pre-wrap break-all">
                {isDev ? error.message : ''}
                {error.digest ? `\n\nDigest: ${error.digest}` : ''}
              </pre>
            )}
          </div>
        )}
        {/* 按钮组 */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            size="md"
            autoLoading={false}
            onClick={copyError}
          >
            <Copy className="h-4 w-4" />
            {copied ? t('common.copied') : t('error.copy')}
          </Button>
          <Button
            variant="primary"
            size="md"
            autoLoading={false}
            onClick={reset}
          >
            <RefreshCw className="h-4 w-4" />
            {t('error.retry')}
          </Button>
        </div>
      </div>
    </div>
  );
}
