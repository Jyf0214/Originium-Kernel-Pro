'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarCollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * 侧栏折叠/展开按钮
 *
 * - 折叠状态显示展开图标，展开状态显示折叠图标
 * - 仅在桌面端可见（父容器控制显隐）
 * - 使用项目现有的 zinc 色调和 rounded-xl 风格
 */
function SidebarCollapseButton({ collapsed, onToggle }: SidebarCollapseButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300 w-full no-underline font-medium"
      aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
    >
      {collapsed ? (
        <PanelLeftOpen size={18} className="shrink-0 text-zinc-300" />
      ) : (
        <PanelLeftClose size={18} className="shrink-0 text-zinc-300" />
      )}
      {!collapsed && <span>折叠侧栏</span>}
    </button>
  );
}

export default SidebarCollapseButton;
