'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, ExternalLink, RefreshCw, ArrowUp, Palette } from 'lucide-react';
import { cn } from '@/lib/ui';
import {
  modalContentVariants,
  modalTransition,
} from '@/components/ui/motion';
import { useThemeMode } from '@/hooks/use-theme-mode';

/** 菜单项类型定义 */
interface MenuItem {
  /** 唯一标识 */
  id: string;
  /** 显示文本 */
  label: string;
  /** 图标组件 */
  icon: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否分割线 */
  divider?: boolean;
}

/** 主题模式显示名称 */
const THEME_LABELS: Record<string, string> = {
  light: '亮色模式',
  dark: '暗色模式',
  system: '跟随系统',
};

/** 菜单项通用样式 */
const menuItemClass = cn(
  'flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300',
  'hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer',
  'select-none active:scale-[0.98]'
);

/** 菜单容器样式 */
const menuContainerClass = cn(
  'bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700',
  'shadow-xl p-1.5 min-w-[180px]'
);

/** 自定义右键菜单组件 */
export function ContextMenu() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { mode, cycle } = useThemeMode();

  /** 处理右键事件 */
  const handleContextMenu = useCallback((e: MouseEvent) => {
    // 忽略输入框内的右键
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    e.preventDefault();

    // 计算菜单位置，防止超出视口
    const { clientX, clientY } = e;
    const menuWidth = 200;
    const menuHeight = 260;
    const padding = 8;

    let x = clientX;
    let y = clientY;

    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }
    if (x < padding) x = padding;
    if (y < padding) y = padding;

    setPosition({ x, y });
  }, []);

  /** 关闭菜单 */
  const closeMenu = useCallback(() => {
    setPosition(null);
  }, []);

  /** 复制当前页面链接 */
  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).catch(() => {
      // 剪贴板 API 不可用时使用 fallback（document.execCommand 已废弃，但为兼容旧浏览器保留）
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      // 注意：document.execCommand('copy') 已废弃，但在某些旧浏览器中仍是唯一可用的方法
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
    closeMenu();
  }, [closeMenu]);

  /** 新标签页打开当前页面 */
  const handleOpenNewTab = useCallback(() => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
    closeMenu();
  }, [closeMenu]);

  /** 刷新页面 */
  const handleRefresh = useCallback(() => {
    closeMenu();
    window.location.reload();
  }, [closeMenu]);

  /** 回到顶部 */
  const handleScrollTop = useCallback(() => {
    closeMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [closeMenu]);

  /** 主题切换 */
  const handleThemeToggle = useCallback(() => {
    cycle();
    closeMenu();
  }, [cycle, closeMenu]);

  /** 构建菜单项列表 */
  const menuItems: MenuItem[] = [
    {
      id: 'copy-link',
      label: '复制链接',
      icon: <Link size={15} />,
      onClick: handleCopyLink,
    },
    {
      id: 'new-tab',
      label: '新标签页打开',
      icon: <ExternalLink size={15} />,
      onClick: handleOpenNewTab,
    },
    {
      id: 'refresh',
      label: '刷新页面',
      icon: <RefreshCw size={15} />,
      onClick: handleRefresh,
    },
    {
      id: 'scroll-top',
      label: '回到顶部',
      icon: <ArrowUp size={15} />,
      onClick: handleScrollTop,
    },
    {
      id: 'divider',
      label: '',
      icon: null,
      divider: true,
    },
    {
      id: 'theme',
      label: `主题：${THEME_LABELS[mode] ?? '跟随系统'}`,
      icon: <Palette size={15} />,
      onClick: handleThemeToggle,
    },
  ];

  // 绑定右键事件 + 点击外部关闭 + ESC 关闭
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContextMenu, closeMenu]);

  return (
    <AnimatePresence>
      {position && (
        <motion.div
          ref={menuRef}
          variants={modalContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={modalTransition}
          className={cn(menuContainerClass, 'fixed z-[250]')}
          style={{
            left: position.x,
            top: position.y,
          }}
          onContextMenu={(e) => e.preventDefault()}
          role="menu"
          aria-label="上下文菜单"
        >
          {menuItems.map((item) =>
            item.divider ? (
              <div
                key={item.id}
                className="my-1 border-t border-zinc-100 dark:border-zinc-700"
              />
            ) : (
              <button
                key={item.id}
                onClick={item.onClick}
                className={menuItemClass}
                disabled={item.divider}
                role="menuitem"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
