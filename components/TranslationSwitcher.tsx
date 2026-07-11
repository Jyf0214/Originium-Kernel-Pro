'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/ui';
import { useI18n } from '@/hooks/use-i18n';

/** 翻译版本信息 */
interface TranslationInfo {
  lang: string;
  slug: string;
  title: string;
}

/** API 返回的翻译查询结果 */
interface TranslationsResponse {
  original: { lang: string; slug: string } | null;
  translations: TranslationInfo[];
}

/** 语言代码 → 显示名称映射 */
const LANG_LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
};

function getLangLabel(lang: string): string {
  return LANG_LABELS[lang] ?? lang;
}

interface TranslationSwitcherProps {
  /** 当前文章路径（如 /posts/daily/2024-01-15） */
  slug: string;
  /** 从 frontmatter 读取的 translations 映射（可选，作为预渲染数据） */
  initialTranslations?: Record<string, string>;
  className?: string;
}

/**
 * 文章多语言切换组件
 *
 * 显示当前文章可用的语言版本，点击切换到对应语言版本。
 * 支持两种数据来源：
 * 1. frontmatter 预渲染数据（initialTranslations）
 * 2. 运行时 API 查询（作为降级方案）
 */
export function TranslationSwitcher({
  slug,
  initialTranslations,
  className,
}: TranslationSwitcherProps) {
  const { locale } = useI18n();
  const [translations, setTranslations] = useState<TranslationInfo[]>([]);
  const [loading, setLoading] = useState(!initialTranslations);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // 如果有预渲染数据，直接使用
    if (initialTranslations && Object.keys(initialTranslations).length > 0) {
      // 将 frontmatter 映射转换为 TranslationInfo 数组
      const entries = Object.entries(initialTranslations)
        .map(([lang, translationSlug]) => ({
          lang,
          slug: translationSlug,
          title: '', // frontmatter 中没有翻译版本的标题
        }));

      if (entries.length > 0) {
        setTranslations(entries);
        setLoading(false);
        return;
      }
    }

    // 降级：通过 API 查询翻译版本
    const controller = new AbortController();

    async function fetchTranslations() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/translations?slug=${encodeURIComponent(slug)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: TranslationsResponse = await res.json();
        if (data.translations.length > 0) {
          setTranslations(data.translations);
        }
      } catch {
        // 请求被取消或网络错误，静默处理
      } finally {
        setLoading(false);
      }
    }

    void fetchTranslations().catch(console.error);
    return () => controller.abort();
  }, [slug, initialTranslations]);

  // 无翻译版本时不渲染
  if (!loading && translations.length === 0) {
    return null;
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500',
          expanded && 'bg-zinc-50 border-zinc-300',
        )}
        aria-expanded={expanded}
        aria-label="切换语言"
      >
        <Globe size={14} className="text-zinc-500 dark:text-zinc-400" />
        {loading ? (
          <span className="text-zinc-400 dark:text-zinc-500">...</span>
        ) : (
          <span className="text-zinc-600 dark:text-zinc-400">{getLangLabel(locale)}</span>
        )}
      </button>

      {expanded && translations.length > 0 && (
        <div className="flex items-center gap-1">
          {translations.map((t) => (
            <Link
              key={t.lang}
              href={t.slug}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 text-zinc-600 dark:text-zinc-400',
                t.lang === locale && 'bg-zinc-50 border-zinc-300 text-zinc-900 dark:text-zinc-100',
              )}
              title={t.title || getLangLabel(t.lang)}
            >
              {getLangLabel(t.lang)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
