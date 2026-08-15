"use client";

import React from 'react';
import { useAvailableWidth } from '@/hooks/use-available-width';

interface ThreeColumnLayoutProps {
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  children: React.ReactNode;
  /** 是否在移动端显示左侧边栏（默认隐藏） */
  showMobileLeftSidebar?: boolean;
  /** 是否在移动端显示右侧边栏（默认隐藏） */
  showMobileRightSidebar?: boolean;
}

/**
 * 三栏布局组件
 * 
 * - 桌面端：左侧边栏（可选）、主内容、右侧边栏（可选）
 * - 移动端：仅显示主内容，可选显示左/右侧边栏
 * - 响应式断点：1280px（xl）以下隐藏侧边栏
 * 
 * @param leftSidebar 左侧边栏内容
 * @param rightSidebar 右侧边栏内容
 * @param children 主内容
 * @param showMobileLeftSidebar 是否在移动端显示左侧边栏
 * @param showMobileRightSidebar 是否在移动端显示右侧边栏
 */
export function ThreeColumnLayout({
  leftSidebar,
  rightSidebar,
  children,
  showMobileLeftSidebar = false,
  showMobileRightSidebar = false,
}: ThreeColumnLayoutProps) {
  const isDesktop = useAvailableWidth();
  // 左侧栏是导航型面板：只要有内容就渲染（由 CSS md 断点控制显隐）；
  // 右侧栏是信息型面板：仅宽屏（xl）或显式开启时显示
  const showLeftSidebar = !!leftSidebar || showMobileLeftSidebar;
  const showRightSidebar = isDesktop || showMobileRightSidebar;

  return (
    <div className="flex min-h-screen w-full">
      {/* 左侧边栏：宽度由内容自适应（子组件自身的折叠宽度变化可直接驱动布局），
          断点与侧边栏自身（md）对齐，避免 768-1279px 区间出现无侧边栏缺口；
          背景与边框由侧栏内容组件自行控制，避免双重叠加 */}
      {showLeftSidebar && leftSidebar && (
        <div className="hidden md:flex flex-col shrink-0">
          {leftSidebar}
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 w-full min-w-0">
        {children}
      </div>

      {/* 右侧边栏 */}
      {showRightSidebar && rightSidebar && (
        <div className="hidden xl:flex flex-col w-64 shrink-0 bg-white dark:bg-zinc-800 border-l border-zinc-200 dark:border-zinc-700">
          {rightSidebar}
        </div>
      )}
    </div>
  );
}

/**
 * 移动端抽屉布局组件
 * 
 * 用于在移动端显示临时侧边栏
 * 
 * @param isOpen 抽屉是否打开
 * @param onClose 关闭抽屉的回调
 * @param children 抽屉内容
 * @param side 抽屉位置（左/右）
 */
export function MobileDrawerLayout({
  isOpen,
  onClose,
  children,
  side = 'left',
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉内容 */}
      <div
        className={`fixed top-0 h-full w-64 max-w-[85vw] bg-white dark:bg-zinc-900 shadow-2xl border-zinc-200 dark:border-zinc-700 transform transition-transform duration-300 ease-in-out ${
          side === 'left' ? 'left-0' : 'right-0'
        } ${isOpen ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'}`}
      >
        {children}
      </div>
    </div>
  );
}