/**
 * 全站统一动效配置
 *
 * 所有弹窗、卡片、列表的进场/退场动画均从此文件导出，
 * 确保全站动效风格一致，且不使用 scale 变换（避免文字拉伸）。
 */
import type { Variants, Transition } from 'motion/react';

/* ── 缓动曲线 ── */

/** 弹窗/卡片标准缓动：开头稍快、结尾减速的自然节奏 */
export const EASE_STANDARD: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 快速缓动：用于轻量级交互反馈 */
export const EASE_FAST: [number, number, number, number] = [0.4, 0, 0.2, 1];

/* ── 弹窗/对话框 ── */

/** 弹窗内容容器进场/退场（从下方滑入 + 淡入，无 scale） */
export const modalContentVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

/** 弹窗遮罩层进场/退场（仅透明度变化） */
export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** 弹窗标准过渡配置 */
export const modalTransition: Transition = {
  duration: 0.2,
  ease: EASE_STANDARD,
};

/** 弹窗遮罩过渡配置（稍慢于内容，视觉更柔和） */
export const modalOverlayTransition: Transition = {
  duration: 0.25,
  ease: EASE_FAST,
};

/* ── 卡片/列表项 ── */

/** 卡片进场/退场（从下方滑入 + 淡入，退场向上滑出） */
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/** 紧凑列表项进场/退场（较小的位移幅度） */
export const compactCardVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** 卡片标准过渡配置 */
export const cardTransition: Transition = {
  duration: 0.3,
  ease: EASE_STANDARD,
};

/* ── 轻量级提示/浮层 ── */

/** tooltip/小浮层进场/退场 */
export const tooltipVariants: Variants = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/** tooltip 过渡配置 */
export const tooltipTransition: Transition = {
  duration: 0.15,
  ease: EASE_FAST,
};

/* ── 工具函数 ── */

/**
 * 生成交错延迟时间
 * @param index 当前项索引
 * @param baseDelay 每项基础延迟（秒），默认 0.03
 * @returns 延迟时间（秒）
 */
export function staggerDelay(index: number, baseDelay = 0.03): number {
  return index * baseDelay;
}
