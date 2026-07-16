/**
 * 帖子日期格式化
 * 复用自 PostCardBodyFooter 和 PostCard compact 模式的日期显示逻辑
 */
const DATE_LOCALE_MAP: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

/**
 * 格式化帖子日期为简短格式（如 "Jul 12"）
 * @param date ISO 日期字符串
 * @param locale 语言环境缩写（zh/en/ja/ko），默认 'zh'
 */
export function formatPostDate(date: string, locale = 'zh'): string {
  const lc = DATE_LOCALE_MAP[locale] ?? 'zh-CN';
  return new Date(date).toLocaleDateString(lc, { month: 'short', day: 'numeric' });
}
