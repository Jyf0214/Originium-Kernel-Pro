/**
 * 全站统一动效配置
 *
 * 所有弹窗、卡片、列表的进场/退场动画均从此文件导出，
 * 确保全站动效风格一致，且不使用 scale 变换（避免文字拉伸）。
 */
import type { Variants, Transition } from 'motion/react';

/* ── 时长刻度（全站统一节奏，禁止散落魔法值） ── */

/**
 * 三档时长刻度（秒）：
 * - FAST：hover 微反馈、图标变色、文字淡入
 * - MID：状态切换（默认档）、展开/折叠、浮层进出
 * - SLOW：弹层完整展开、面板滑动、抽屉滑入
 */
export const DURATION = {
  FAST: 0.15,
  MID: 0.2,
  SLOW: 0.3,
} as const;

/* ── 缓动曲线 ── */

/** 弹窗/卡片标准缓动：开头稍快、结尾减速的自然节奏 */
export const EASE_STANDARD: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 快速缓动：用于轻量级交互反馈 */
export const EASE_FAST: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** 双向缓动：仅用于展开/收起等往复动画 */
export const EASE_IN_OUT: [number, number, number, number] = [0.4, 0, 0.6, 1];

/* ── 布局弹簧 ── */

/**
 * 布局级弹簧：高刚度 + 高阻尼，起手快、收敛快、几乎无回弹。
 * 仅用于"连续对象"联动（侧栏宽度、面板跟随），离散状态切换一律用 CSS transition。
 */
export const SPRING_LAYOUT = {
  type: 'spring',
  stiffness: 380,
  damping: 26,
  mass: 0.4,
  restDelta: 0.5,
  restSpeed: 2,
} as const satisfies Transition;

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
  duration: DURATION.MID,
  ease: EASE_STANDARD,
};

/** 弹窗遮罩过渡配置（稍慢于内容，视觉更柔和） */
export const modalOverlayTransition: Transition = {
  duration: DURATION.SLOW,
  ease: EASE_FAST,
};

/* ── 卡片/列表项 ── */

/** 卡片进场/退场（从下方滑入 + 淡入，退场向上滑出） */
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** 紧凑列表项进场/退场（较小的位移幅度） */
export const compactCardVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/** 卡片标准过渡配置 */
export const cardTransition: Transition = {
  duration: DURATION.SLOW,
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
  duration: DURATION.FAST,
  ease: EASE_FAST,
};

/* ── 面板滑动 ── */

/** 面板滑动位移基准（px）：小位移保持轻盈，不做大范围平移 */
const PANEL_SLIDE_OFFSET = 8;

/**
 * 生成水平方向感知的面板滑动变体。
 * 由调用方通过 custom 传方向（1 前进 / -1 后退 / 0 无位移），
 * 配合 AnimatePresence 实现左/右停靠面板的方向感知切换。
 */
function createPanelSlideVariants(horizontalSign: 1 | -1) {
  return {
    initial: (direction: -1 | 0 | 1) => ({
      opacity: 0,
      x: direction * PANEL_SLIDE_OFFSET * horizontalSign,
    }),
    animate: { opacity: 1, x: 0 },
    exit: (direction: -1 | 0 | 1) => ({
      opacity: 0,
      x: -direction * PANEL_SLIDE_OFFSET * horizontalSign,
    }),
  } satisfies Variants;
}

/** 左停靠面板滑动变体 */
export const panelSlideVariantsLeft = createPanelSlideVariants(1);

/** 右停靠面板滑动变体 */
export const panelSlideVariantsRight = createPanelSlideVariants(-1);

/** 面板滑动标准过渡 */
export const panelSlideTransition: Transition = {
  duration: DURATION.MID,
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
