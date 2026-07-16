// FooterCopyright - 底栏：版权信息 + 协议链接 + 品牌文字（打字机 + 自定义文案）
// 包含私有的 TypedText 打字机效果组件。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

// ─── Typed Text（私有辅助组件） ──────────────────────

interface TypedTextProps {
  prefix?: string;
  texts: string[];
}

/**
 * 打字机效果：逐字显示 / 删除，并在 texts 之间循环。
 */
function TypedText({ prefix, texts }: TypedTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!texts.length) return;
    const currentText = texts[textIndex];
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentText.length) {
            setDisplayed(currentText.slice(0, charIndex + 1));
            setCharIndex((prev) => prev + 1);
          } else {
            // 完整显示后停顿 2 秒开始删除
            const pause = setTimeout(() => setIsDeleting(true), 2000);
            currentPauseRef.current = pause;
          }
        } else {
          if (charIndex > 0) {
            setDisplayed(currentText.slice(0, charIndex - 1));
            setCharIndex((prev) => prev - 1);
          } else {
            setIsDeleting(false);
            setTextIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? 50 : 100,
    );

    return () => {
      clearTimeout(timeout);
      if (currentPauseRef.current) {
        clearTimeout(currentPauseRef.current);
        currentPauseRef.current = null;
      }
    };
  }, [charIndex, isDeleting, textIndex, texts]);

  if (!texts.length) return null;

  return (
    <span>
      {prefix && <span>{prefix}</span>}
      <span className="text-zinc-900 font-medium">{displayed}</span>
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ─── FooterBar（导出的版权底栏） ────────────────────

export interface FooterBarProps {
  owner: { enable: boolean; since: number; author?: string };
  author: string;
  customText: string;
  typedTextPrefix?: string;
  typedText?: string[];
}

/**
 * 页脚底栏：左侧 © 年份 + 协议链接，右侧打字机文案 + 自定义文字。
 */
export function FooterBar({
  owner,
  author,
  customText,
  typedTextPrefix,
  typedText,
}: FooterBarProps) {
  const year = new Date().getFullYear();

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* 左侧：版权 + 协议 */}
        <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 min-w-0 overflow-hidden">
          {owner.enable && (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              &copy; {owner.since}&mdash;{year} {author}
            </span>
          )}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 transition-colors duration-300 text-xs shrink-0"
            title="CC BY-NC-SA 4.0"
          >
            CC BY-NC-SA 4.0
          </a>
        </div>

        {/* 右侧：打字机 + 自定义文字 + 回到顶部 */}
        <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-4 min-w-0 overflow-hidden">
          {typedText && typedText.length > 0 && (
            <TypedText prefix={typedTextPrefix} texts={typedText} />
          )}
          {customText && <span>{customText}</span>}
          <button
            type="button"
            onClick={handleScrollTop}
            className="shrink-0 w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="回到顶部"
            aria-label="回到顶部"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default FooterBar;
