import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 共享卡片/输入框基础样式 — 替代各处硬编码的 `bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700`
 * 统一使用此变量可减少 7+ 处重复样式组合
 */
export const CARD_BORDER_CLASS =
  'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700';
