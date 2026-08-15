"use client";

import type { Variants, Transition } from 'framer-motion';

/**
 * 常用动效配置
 */

// 淡入淡出
const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// 滑动（从右侧）
const slideInFromRightVariants: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

// 滑动（从左侧）
const slideInFromLeftVariants: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

// 缩放
const scaleVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
};

// 弹跳
const bounceTransition: Transition = {
  type: 'spring',
  damping: 10,
  stiffness: 100,
};

// 平滑过渡
const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

/**
 * 抽屉动效
 */
export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
};

/**
 * 遮罩层动效
 */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * 按钮按压动效
 */
export const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  press: {
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
};

/**
 * 页面切换动效
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * 常用过渡效果
 */
export const transitions = {
  smooth: smoothTransition,
  bounce: bounceTransition,
};

/**
 * 常用变体
 */
export const variants = {
  fade: fadeVariants,
  slideInFromRight: slideInFromRightVariants,
  slideInFromLeft: slideInFromLeftVariants,
  scale: scaleVariants,
};