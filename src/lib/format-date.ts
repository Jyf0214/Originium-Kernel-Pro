/**
 * 帖子日期格式化
 * 复用自 PostCardBodyFooter 和 PostCard compact 模式的日期显示逻辑
 */
import { lookup, type Locale } from '@/i18n/translate';

const DATE_LOCALE_MAP: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export type PostDateFormat = 'simple' | 'date' | 'relative';

/**
 * 按 postMeta.dateType 解析要展示的日期
 * - updated/both：优先更新日期，缺失时回退创建日期
 * - created：始终显示创建日期
 */
export function resolveDisplayDate(
  date?: string,
  updated?: string,
  dateType?: 'created' | 'updated' | 'both',
): string | undefined {
  if (dateType === 'updated' || dateType === 'both') return updated ?? date;
  return date;
}

/**
 * 格式化帖子日期
 * @param date ISO 日期字符串
 * @param locale 语言环境缩写（zh/en/ja/ko），默认 'zh'
 * @param format 格式：simple（如 "Jul 12"）| date（如 "2026-08-08"）| relative（如 "3 天前"）
 */
export function formatPostDate(date: string, locale = 'zh', format: PostDateFormat = 'simple'): string {
  const lc = DATE_LOCALE_MAP[locale] ?? 'zh-CN';
  switch (format) {
    case 'date':
      return new Date(date).toLocaleDateString(lc, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    case 'relative':
      return formatRelativeDate(new Date(date), lc);
    case 'simple':
      return new Date(date).toLocaleDateString(lc, { month: 'short', day: 'numeric' });
  }
}

/** 相对时间：今天/昨天/N 天前/N 周前/N 个月前/N 年前（文案走 i18n 字典） */
function formatRelativeDate(date: Date, lc: string): string {
  // 项目仅有 zh-CN / en 两套文案，ja/ko 回退英文
  const locale: Locale = lc === 'zh-CN' ? 'zh-CN' : 'en';
  const t = (key: string, params?: Record<string, string | number>) => lookup(locale, key, params);

  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays <= 0) return t('lib.formatDate.today');
  if (diffDays === 1) return t('lib.formatDate.yesterday');
  if (diffDays < 7) return t('lib.formatDate.daysAgo', { days: diffDays });
  if (diffDays < 30) return t('lib.formatDate.weeksAgo', { weeks: Math.floor(diffDays / 7) });
  if (diffDays < 365) return t('lib.formatDate.monthsAgo', { months: Math.floor(diffDays / 30) });
  return t('lib.formatDate.yearsAgo', { years: Math.floor(diffDays / 365) });
}
