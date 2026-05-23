'use client';

import { useEffect } from 'react';
import { useConfig } from '@/hooks/use-config';
import { message } from 'antd';

interface CopyInterceptorProps {
  articleRef: React.RefObject<HTMLDivElement | null>;
  authorName?: string;
}

export default function CopyInterceptor({ articleRef, authorName }: CopyInterceptorProps) {
  const { config } = useConfig();
  const cfg = config?.copy;
  const copyrightCfg = config?.copyright;

  useEffect(() => {
    const el = articleRef.current;
    if (!el || !cfg?.enable) return;

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString();
      if (!selectedText) return;

      const limit = cfg.copyright?.limitCount ?? 50;

      message.info('已复制到剪贴板');

      if (cfg.copyright?.enable && selectedText.length >= limit && copyrightCfg) {
        let copyrightText = `\n\n---\n本文著作权归作者所有`;
        if (copyrightCfg.license) {
          copyrightText += `\n许可协议: ${copyrightCfg.license}`;
          if (copyrightCfg.licenseUrl) {
            copyrightText += ` (${copyrightCfg.licenseUrl})`;
          }
        }
        if (copyrightCfg.location) {
          copyrightText += `\n来源: ${copyrightCfg.location}`;
        }

        e.clipboardData?.setData('text/plain', selectedText + copyrightText);
        e.preventDefault();
      }
    };

    el.addEventListener('copy', handleCopy);
    return () => el.removeEventListener('copy', handleCopy);
  }, [cfg, copyrightCfg, articleRef, authorName]);

  return null;
}
