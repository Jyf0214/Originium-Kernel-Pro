'use client';

import React, { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, WrapText } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import type { HighlightConfig } from './types';
import { extractTextContent } from './utils';

/** 从 rehype-pretty-code 生成的 figure+pre 元素中提取纯文本代码 */
function getCodeText(pre: React.ReactElement): string {
  const props = pre.props as Record<string, unknown> | undefined;
  const children = props?.children as React.ReactNode;
  return extractTextContent(children).replace(/\n$/, '');
}

function CodeToolbar({
  language,
  cfg,
  copied,
  copyError,
  collapsed,
  wrap,
  exceedsLimit,
  showWrap,
  onCopy,
  onToggleCollapse,
  onToggleWrap,
}: {
  language: string;
  cfg: HighlightConfig;
  copied: boolean;
  copyError: boolean;
  collapsed: boolean;
  wrap: boolean;
  exceedsLimit: boolean;
  showWrap: boolean;
  onCopy: () => void;
  onToggleCollapse: () => void;
  onToggleWrap: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 rounded-t-2xl border-b border-zinc-700">
      <div className="flex items-center gap-2">
        {cfg.lang && language && (
          <Tag size="xs" variant="dark">
            {language}
          </Tag>
        )}
        {copyError && (
          <span className="text-xs text-red-400 animate-pulse">复制失败</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {cfg.copy && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 ui-press"
            onClick={onCopy}
            title="复制代码"
            aria-label="复制代码"
          />
        )}
        {showWrap && cfg.wordWrap && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            icon={<WrapText size={14} />}
            className={wrap ? 'text-zinc-200 bg-zinc-700' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700'}
            onClick={onToggleWrap}
            title="自动换行"
            aria-label="自动换行"
          />
        )}
        {exceedsLimit && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            autoLoading={false}
            icon={collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 ui-press"
            onClick={onToggleCollapse}
            title={collapsed ? '展开' : '折叠'}
            aria-label={collapsed ? '展开代码' : '折叠代码'}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 代码块组件 — 包装 rehype-pretty-code 生成的高亮 HTML，添加交互工具栏。
 * 接收 figure 内的 pre 元素（已含 Shiki 高亮 HTML），提取语言和文本用于工具栏功能，
 * 保留原始高亮 HTML 用于显示。
 */
export function CodeBlock({
  children,
  cfg,
}: {
  children: ReactNode;
  cfg: HighlightConfig;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [collapsed, setCollapsed] = useState(cfg.shrink);
  const [wrap, setWrap] = useState(cfg.wordWrap);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // 从 rehype-pretty-code 生成的 pre 元素提取信息
  const preElement = children as React.ReactElement;
  const preProps = preElement.props as Record<string, unknown> | undefined;
  const language = (preProps?.['data-language'] as string) ?? '';
  const codeText = getCodeText(preElement);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopyError(true);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setCopyError(false), 2000);
    });
  }, [codeText]);

  const exceedsLimit = cfg.heightLimit > 0 && codeText.length > cfg.heightLimit;

  // 使用 cloneElement 保留 rehype-pretty-code 在 pre 上设置的全部属性
  // （style 含 Shiki 背景色，data-language/data-theme 含元数据）
  const wrappedPre = React.cloneElement(preElement as React.ReactElement<Record<string, unknown>>, {
    className: `${wrap ? '' : 'overflow-x-auto'} ${collapsed ? 'max-h-40 overflow-hidden' : ''} rounded-b-2xl border border-zinc-800 border-t-0`,
  });

  return (
    <div className="relative group my-8">
      <CodeToolbar
        language={language}
        cfg={cfg}
        copied={copied}
        copyError={copyError}
        collapsed={collapsed}
        wrap={wrap}
        exceedsLimit={exceedsLimit}
        showWrap
        onCopy={handleCopy}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggleWrap={() => setWrap(!wrap)}
      />
      {wrappedPre}
    </div>
  );
}

/**
 * 无语法高亮的代码块 — 含一键复制按钮，用于无语言标识的代码块。
 * 保留原有视觉样式，与 rehype-pretty-code 高亮块保持一致的圆角和间距。
 */
export function UnhighlightedCodeBlock({
  lang,
  codeText,
  children,
}: {
  lang: string;
  codeText: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      /* 剪贴板写入失败时静默忽略 */
    });
  }, [codeText]);

  return (
    <div className="relative group my-8">
      <pre className="bg-zinc-900 rounded-2xl p-4 text-sm text-zinc-300 overflow-x-auto">
        {lang && <span className="code-lang-badge">{lang}</span>}
        <button
          className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-600 hover:text-zinc-200 group-hover:opacity-100"
          onClick={handleCopy}
          title="复制代码"
          aria-label="复制代码"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
        <code>{children}</code>
      </pre>
    </div>
  );
}
