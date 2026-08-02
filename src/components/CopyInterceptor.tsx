'use client';

import { useEffect } from 'react';
import { useConfig } from '@/hooks/use-config';
import { message } from 'antd';
import type { AuthorInfo } from '@/types/author';
import { useI18n } from '@/hooks/use-i18n';
import { getTranslate } from '@/i18n/translate';

interface CopyInterceptorProps {
  articleRef: React.RefObject<HTMLDivElement | null>;
  authorName?: string;
  /** 作者列表数据 — 用于来源地信息 */
  authorInfo?: AuthorInfo | null;
}

function buildCopyrightText(copyrightCfg: { license?: string; licenseUrl?: string; copyTemplate?: { authorLine: string; licensePrefix: string; sourcePrefix: string } }, location?: string): string {
  const template = copyrightCfg.copyTemplate;
  let text = `\n\n---\n${template?.authorLine ?? getTranslate('copyInterceptor.defaultAuthorLine')}`;
  if (copyrightCfg.license) {
    text += `\n${template?.licensePrefix ?? getTranslate('copyInterceptor.licensePrefix')}${copyrightCfg.license}`;
    if (copyrightCfg.licenseUrl) {
      text += ` (${copyrightCfg.licenseUrl})`;
    }
  }
  if (location) {
    text += `\n${template?.sourcePrefix ?? getTranslate('copyInterceptor.sourcePrefix')}${location}`;
  }
  return text;
}

export default function CopyInterceptor({ articleRef, authorName, authorInfo }: CopyInterceptorProps) {
  const { config } = useConfig();
  const { t } = useI18n();
  const cfg = config?.copy;
  const copyrightCfg = config?.copyright;
  const location = authorInfo?.location;

  useEffect(() => {
    const el = articleRef.current;
    if (!el || !cfg?.enable) return;

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString();
      if (!selectedText) return;

      const limit = cfg.copyright?.limitCount ?? 50;

      message.info(t('copyInterceptor.copied'));

      if (cfg.copyright?.enable && selectedText.length >= limit && copyrightCfg) {
        e.clipboardData?.setData('text/plain', selectedText + buildCopyrightText(copyrightCfg, location));
        e.preventDefault();
      }
    };

    el.addEventListener('copy', handleCopy);
    return () => el.removeEventListener('copy', handleCopy);
  }, [cfg, copyrightCfg, articleRef, authorName, location, t]);

  return null;
}
